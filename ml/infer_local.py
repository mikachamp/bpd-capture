"""
Local Offline Inference CLI.
Takes an image photo, crops the page boundary, runs local offline model, and outputs JSON.
"""
import os
import sys
import json
import re

def parse_with_donut(image_path, model_dir="ml/model_checkpoint"):
    from transformers import DonutProcessor, VisionEncoderDecoderModel
    from PIL import Image

    processor = DonutProcessor.from_pretrained(model_dir)
    model = VisionEncoderDecoderModel.from_pretrained(model_dir)
    model.eval()

    image = Image.open(image_path).convert("RGB")
    pixel_values = processor(image, return_tensors="pt").pixel_values

    # Generate sequence
    task_prompt = "<s_work_ticket>"
    decoder_input_ids = processor.tokenizer(task_prompt, add_special_tokens=False, return_tensors="pt").input_ids

    outputs = model.generate(
        pixel_values,
        decoder_input_ids=decoder_input_ids,
        max_length=768,
        early_stopping=True,
        pad_token_id=processor.tokenizer.pad_token_id,
        eos_token_id=processor.tokenizer.eos_token_id,
        use_cache=True,
        num_beams=1,
        bad_words_ids=[[processor.tokenizer.unk_token_id]],
        return_dict_in_generate=True,
    )

    sequence = processor.batch_decode(outputs.sequences)[0]
    sequence = sequence.replace(processor.tokenizer.eos_token, "").replace(processor.tokenizer.pad_token, "")
    sequence = re.sub(r"<.*?>", "", sequence, count=1).strip()
    return json.loads(sequence)

def parse_work_ticket_offline(image_path, model_dir=None, use_edge_crop=True):
    """
    Executes the full offline pipeline:
    1. Page Edge Detection & Perspective Crop
    2. Model Inference
    3. Returns parsed WorkTicket dictionary
    """
    cropped_path = image_path
    if use_edge_crop:
        try:
            from edge_detector import detect_and_crop_page
            base, ext = os.path.splitext(image_path)
            cropped_path = f"{base}_cropped{ext}"
            detect_and_crop_page(image_path, cropped_path)
            print(f"[1/2] Page outline detected & cropped: {cropped_path}")
        except Exception as e:
            print(f"[Warning] Edge detection skipped: {e}")
            cropped_path = image_path

    print(f"[2/2] Running local offline extraction...")
    if model_dir and os.path.exists(model_dir):
        return parse_with_donut(cropped_path, model_dir)
    else:
        # Ground-truth demonstration parser based on Blueprint Digital's benchmark layout
        print("[Info] Model checkpoint path not specified or in training; showing benchmark structure.")
        return {
            "status": "ready_for_weights",
            "image": image_path,
            "cropped_image": cropped_path
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        img = sys.argv[1]
        mdir = sys.argv[2] if len(sys.argv) > 2 else "ml/model_checkpoint"
        res = parse_work_ticket_offline(img, mdir)
        print("\n--- Extracted Work Ticket Data ---")
        print(json.dumps(res, indent=2))
    else:
        print("Usage: python infer_local.py <ticket_image.jpg> [model_dir]")
