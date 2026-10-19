"""
Fine-tuning script for Donut (Document Understanding Transformer) on BPD Work Tickets.
Trains locally without cloud APIs.
"""
import os
import json
import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image

class WorkTicketDataset(Dataset):
    def __init__(self, data_dir, processor, max_length=768, split="train"):
        self.data_dir = data_dir
        self.processor = processor
        self.max_length = max_length
        self.images_dir = os.path.join(data_dir, "images")
        self.examples = []
        
        meta_path = os.path.join(data_dir, "metadata.jsonl")
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                for line in f:
                    self.examples.append(json.loads(line))

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        item = self.examples[idx]
        image_path = os.path.join(self.images_dir, item["image"])
        image = Image.open(image_path).convert("RGB")
        
        pixel_values = self.processor(image, return_tensors="pt").pixel_values.squeeze()
        
        target_seq = item["ground_truth"]
        labels = self.processor.tokenizer(
            target_seq,
            add_special_tokens=True,
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        ).input_ids.squeeze()
        
        # Replace pad tokens with -100 for cross-entropy loss
        labels[labels == self.processor.tokenizer.pad_token_id] = -100
        
        return {"pixel_values": pixel_values, "labels": labels}

def train_donut(data_dir="ml/dataset", output_dir="ml/model_checkpoint", epochs=3, batch_size=2, lr=5e-5):
    from transformers import DonutProcessor, VisionEncoderDecoderModel
    
    print("Loading pretrained base model: naver-clova-ix/donut-base...")
    processor = DonutProcessor.from_pretrained("naver-clova-ix/donut-base")
    model = VisionEncoderDecoderModel.from_pretrained("naver-clova-ix/donut-base")
    
    dataset = WorkTicketDataset(data_dir, processor)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")
    model.to(device)
    model.train()
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    
    for epoch in range(epochs):
        total_loss = 0.0
        for step, batch in enumerate(dataloader):
            pixel_values = batch["pixel_values"].to(device)
            labels = batch["labels"].to(device)
            
            outputs = model(pixel_values=pixel_values, labels=labels)
            loss = outputs.loss
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            if (step + 1) % 5 == 0:
                print(f"Epoch {epoch+1}/{epochs} | Step {step+1}/{len(dataloader)} | Loss: {loss.item():.4f}")
                
        avg_loss = total_loss / max(1, len(dataloader))
        print(f"--- Epoch {epoch+1} finished. Avg Loss: {avg_loss:.4f} ---")
        
    os.makedirs(output_dir, exist_ok=True)
    model.save_pretrained(output_dir)
    processor.save_pretrained(output_dir)
    print(f"Model saved locally to {output_dir}")

if __name__ == "__main__":
    import sys
    data_path = sys.argv[1] if len(sys.argv) > 1 else "ml/dataset"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "ml/model_checkpoint"
    if os.path.exists(data_path):
        train_donut(data_dir=data_path, output_dir=out_path)
    else:
        print(f"Dataset path not found: {data_path}. Run dataset_generator.py first.")
