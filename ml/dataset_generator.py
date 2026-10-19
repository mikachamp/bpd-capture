"""
Synthetic Dataset Generator for Blueprint Digital SO - Work Tickets.
Generates paired ticket images and ground-truth JSON for fine-tuning offline models.
"""
import os
import json
import random
from PIL import Image, ImageDraw, ImageFont

CUSTOMERS = [
    ("Foschini Retail Group (Pty) Ltd", "JD - Hemmingsway", "Nkosingiphile Dlamini", "NkosingiphileD@tfg.co.za"),
    ("Dime 3", "Key Chain Letters", "Mika Williamson", "mika@dime3.co.za"),
    ("Asics South Africa", "Superblast shoe plinth", "Brandon Smith", "bsmith@asics.co.za"),
    ("New Balance SA", "Shoe tags & shelf talkers", "Chloe Jacobs", "chloe@newbalance.co.za"),
    ("Hyrox Fitness", "Event Lightbox 1200x600", "Marco Rossi", "marco@hyrox.com"),
    ("Ackermans", "Key-slot counter sample", "Tanya Van Der Merwe", "tanya@ackermans.co.za"),
    ("JD Sports", "Spinning wheel bracket", "Kyle Adams", "kyle@jdsports.co.za"),
    ("Totalsports", "Illuminated Footwear Riser", "Lwazi Ndlovu", "lwazi@tfg.co.za")
]

MATERIALS = [
    ("3mm White PlexiGlass, White, 300gsm", "Laser cut", "machining"),
    ("5mm Foam Board", "Full Colour - One side only, Trimmed to Size", "finishing"),
    ("3mm Opal Acrylic", "CNC cut & flame polished", "machining"),
    ("White PETG 2mm", "Line bend 90 degrees", "fabricating"),
    ("Lightbox Fabric Skin", "UV printed, silicone keder edge sewn", "finishing"),
    ("Anodised Aluminum Frame", "Miter cut 45 deg & bracket assemble", "fabricating"),
    ("Cast Clear Acrylic 10mm", "Diamond edge polished", "finishing"),
    ("Magnetic Sheet 0.8mm", "Mounted to printed vinyl", "fabricating")
]

ITEMS_TEMPLATES = [
    ("350 BRAND LIGHTBOX SKIN", "H350 x W1202", "Lightbox Fabric Skin", "Print & Trim", "finishing"),
    ("580 BRAND LIGHTBOX SKIN", "H580 x W1202", "Lightbox Fabric Skin", "Print & Trim", "finishing"),
    ("QUAD FEATURE BRAND LIGHTBOX SKIN", "H1200 X W580", "Lightbox Fabric Skin", "Print & Trim", "finishing"),
    ("1202 x 1202 Lightbox Skin Pack", "1202 x 1202", "Lightbox Fabric Skin", "Print & Trim", "finishing"),
    ("Junior Quad Feature Skin Pack", "1202H x 350W", "Lightbox Fabric Skin", "Print & Trim", "finishing"),
    ("KIDS Magnetic Footwear Lightbox Skin Pack", "600x600mm", "Magnetic Sheet 0.8mm", "Mount & Trim", "fabricating"),
    ("Podium Graphic", "400x400mm", "5mm Foam Board", "Trimmed to Size", "finishing"),
    ("Key Chain Letters - 20", None, "3mm White PlexiGlass, White, 300gsm", "Laser cut", "machining"),
    ("Superblast Shoe Plinth", "350x200x50mm", "White PETG 2mm", "CNC cut & thermoformed", "fabricating"),
    ("Acrylic Shelf Talker", "150x50mm", "3mm Opal Acrylic", "Laser cut & bent", "fabricating"),
    ("Brand Tag Pack (500 units)", "80x40mm", "500gsm Cardboard", "Die cut & strung", "finishing"),
    ("Event Lightbox Frame 1200x600", "1200x600x80mm", "Anodised Aluminum Frame", "Assembled with LEDs", "fabricating")
]

CREATORS = ["Ralton", "Tendai", "Oscar", "Lerato", "Sizwe"]
REPS = ["Oscar", "Devon", "Gary", "Natasha"]

def generate_ticket_data(ticket_index=1):
    cust, ref, contact, email = random.choice(CUSTOMERS)
    ce_num = f"{random.randint(5000, 9999)}/{random.randint(1, 3)}"
    so_num = f"S{random.randint(4000, 6500)}"
    po_num = f"CO00{random.randint(100000, 999999)}"
    
    num_items = random.randint(2, 6)
    chosen_templates = random.sample(ITEMS_TEMPLATES, num_items)
    items = []
    
    for t in chosen_templates:
        qty = random.choice([1, 2, 5, 10, 12, 15, 20, 35, 42, 50, 51])
        wt_num = str(random.randint(12000, 19999)) if random.random() > 0.4 else None
        items.append({
            "description": t[0],
            "size": t[1],
            "material": t[2],
            "process": t[3],
            "step": t[4],
            "quantity": qty,
            "wt_number": wt_num
        })
        
    date_day = random.randint(1, 28)
    date_month = random.randint(1, 12)
    created_date = f"{date_day:02d}/{date_month:02d}/26"
    due_day = min(28, date_day + random.randint(3, 14))
    due_date = f"{due_day:02d}/{date_month:02d}/2026"
    
    return {
        "ce_number": ce_num,
        "sales_order_no": so_num,
        "customer": cust,
        "reference": ref,
        "order_no": po_num,
        "contact_name": contact,
        "contact_email": email,
        "contact_phone": f"072 {random.randint(100, 999)} {random.randint(1000, 9999)}",
        "dispatch_method": random.choice(["CLIENT COLLECTION", "COURIER", "INTERNAL INSTALLER", "ROAD FREIGHT"]),
        "created_by": random.choice(CREATORS),
        "sales_rep": random.choice(REPS),
        "created_date": created_date,
        "customer_req_date": due_date,
        "production_due_date": due_date,
        "items": items
    }

def render_ticket_image(data, output_path):
    width, height = 1200, 1650
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Load fonts (fallback to default PIL font if TTF not available)
    try:
        font_large = ImageFont.truetype("arial.ttf", 36)
        font_bold = ImageFont.truetype("arialbd.ttf", 22)
        font_mid = ImageFont.truetype("arial.ttf", 18)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except Exception:
        font_large = font_bold = font_mid = font_small = ImageFont.load_default()

    # Header
    draw.text((60, 40), "SO - Work Ticket", fill=(0, 0, 0), font=font_large)
    draw.text((800, 40), "Blueprint Digital", fill=(0, 0, 0), font=font_large)
    
    # CE No & SO box
    draw.rectangle([60, 100, 1140, 140], fill=(225, 227, 230))
    draw.text((700, 110), f"CE No.    {data['ce_number']}", fill=(0, 0, 0), font=font_bold)
    draw.text((940, 110), "Sales Order No.", fill=(0, 0, 0), font=font_mid)
    draw.text((950, 145), data['sales_order_no'], fill=(0, 0, 0), font=font_large)
    
    # Metadata Block
    y = 150
    draw.text((60, y), f"Customer:    {data['customer']}", fill=(0, 0, 0), font=font_bold)
    draw.text((750, y), f"Created by: {data['created_by']}", fill=(0, 0, 0), font=font_small)
    y += 30
    draw.text((60, y), f"Reference:   {data['reference']}", fill=(0, 0, 0), font=font_bold)
    draw.text((750, y), f"Date:         {data['created_date']}", fill=(0, 0, 0), font=font_small)
    y += 30
    draw.text((60, y), f"Dispatch:     {data['dispatch_method']}", fill=(0, 0, 0), font=font_bold)
    y += 35
    draw.text((60, y), f"Contact:     {data['contact_name']}", fill=(0, 0, 0), font=font_small)
    draw.text((450, y), f"Ord. No: {data['order_no']}", fill=(0, 0, 0), font=font_small)
    draw.text((750, y), f"Rep:          {data['sales_rep']}", fill=(0, 0, 0), font=font_small)
    y += 25
    draw.text((60, y), f"E-mail:        {data['contact_email']}", fill=(0, 0, 180), font=font_small)
    draw.text((450, y), f"Cel:      {data['contact_phone']}", fill=(0, 0, 0), font=font_small)
    
    # Table header
    y = 310
    draw.rectangle([60, y, 1140, y + 30], fill=(215, 218, 222))
    draw.text((70, y + 6), "Items", fill=(0, 0, 0), font=font_bold)
    draw.text((820, y + 6), "Qty", fill=(0, 0, 0), font=font_bold)
    draw.text((1000, y + 6), "WT #:", fill=(0, 0, 0), font=font_bold)
    y += 40
    
    # Items
    for item in data['items']:
        # Checkbox
        draw.rectangle([65, y + 2, 80, y + 17], outline=(80, 80, 80), width=1)
        # Item Description
        draw.text((95, y), item['description'], fill=(0, 0, 0), font=font_bold)
        draw.text((830, y), str(item['quantity']), fill=(0, 0, 0), font=font_bold)
        if item['wt_number']:
            draw.text((1010, y), f"WT #: {item['wt_number']}", fill=(0, 0, 0), font=font_small)
        y += 24
        
        # Subtext details
        if item['size']:
            draw.text((95, y), f"Size: {item['size']}", fill=(100, 100, 100), font=font_small)
            y += 18
        if item['material']:
            draw.text((95, y), item['material'], fill=(90, 90, 90), font=font_small)
            y += 18
        if item['process']:
            draw.text((95, y), item['process'], fill=(90, 90, 90), font=font_small)
            y += 18
            
        draw.line([60, y + 6, 1140, y + 6], fill=(235, 235, 235), width=1)
        y += 16
        
    # Footer
    footer_y = 1530
    draw.line([60, footer_y, 1140, footer_y], fill=(0, 0, 0), width=2)
    draw.text((65, footer_y + 15), f"Cus Req Date:   {data['customer_req_date']}", fill=(0, 0, 0), font=font_bold)
    draw.text((450, footer_y + 15), f"Prod Due:   {data['production_due_date']}", fill=(0, 0, 0), font=font_bold)
    draw.text((850, footer_y + 15), f"Printed: {data['created_date']} 10:15", fill=(100, 100, 100), font=font_small)
    draw.text((1060, footer_y + 15), "Page 1 of 1", fill=(100, 100, 100), font=font_small)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "JPEG", quality=95)

def generate_dataset(num_samples=100, output_dir="ml/dataset"):
    os.makedirs(output_dir, exist_ok=True)
    images_dir = os.path.join(output_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    
    annotations = []
    print(f"Generating {num_samples} synthetic SO - Work Tickets...")
    
    for i in range(1, num_samples + 1):
        data = generate_ticket_data(i)
        img_name = f"ticket_{i:04d}.jpg"
        img_path = os.path.join(images_dir, img_name)
        render_ticket_image(data, img_path)
        
        # Ground truth JSON representation
        annotations.append({
            "image": img_name,
            "ground_truth": json.dumps(data)
        })
        
    meta_path = os.path.join(output_dir, "metadata.jsonl")
    with open(meta_path, "w", encoding="utf-8") as f:
        for ann in annotations:
            f.write(json.dumps(ann) + "\n")
            
    print(f"Dataset generation complete. Saved to {output_dir}")

if __name__ == "__main__":
    generate_dataset(num_samples=20, output_dir="ml/dataset")
