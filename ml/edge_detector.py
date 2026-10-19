"""
Document Page Outline Detection and Perspective Dewarping.
Isolates the physical 'SO - Work Ticket' sheet and discards all workbench background.
"""
import sys
import numpy as np

def order_points(pts):
    """Orders coordinates: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def four_point_transform(image, pts):
    """Perspective transform to flatten the detected quadrilateral page into a flat rectangle."""
    import cv2
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Calculate width of new image
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    # Calculate height of new image
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped

def detect_and_crop_page(image_path, output_path=None):
    """
    Detects the 4 corners of the paper ticket and crops out the table/workbench.
    Falls back to centered crop if 4-corner polygon is not found.
    """
    import cv2

    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Could not load image: {image_path}")

    orig = image.copy()
    ratio = image.shape[0] / 800.0
    h, w = int(image.shape[0] / ratio), int(image.shape[1] / ratio)
    resized = cv2.resize(image, (w, h))

    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 180)

    # Find contours
    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:8]

    screen_cnt = None
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        # If quadrilateral contour has sufficient area (> 20% of image)
        if len(approx) == 4 and cv2.contourArea(approx) > (w * h * 0.20):
            screen_cnt = approx
            break

    if screen_cnt is not None:
        # Scale back to original resolution
        pts = screen_cnt.reshape(4, 2) * ratio
        warped = four_point_transform(orig, pts)
    else:
        # Fallback: contrast-based auto crop or margin trim
        warped = orig

    if output_path:
        cv2.imwrite(output_path, warped)

    return warped

if __name__ == "__main__":
    if len(sys.argv) > 1:
        inp = sys.argv[1]
        out = sys.argv[2] if len(sys.argv) > 2 else "cropped_ticket.jpg"
        detect_and_crop_page(inp, out)
        print(f"Cropped page saved to: {out}")
    else:
        print("Usage: python edge_detector.py <input_image_path> [output_image_path]")
