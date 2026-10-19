"""
ONNX Export utility for offline, zero-cost edge execution of the fine-tuned ticket model.
"""
import os
import torch

def export_to_onnx(model_dir="ml/model_checkpoint", onnx_output="ml/model_onnx"):
    from transformers import DonutProcessor, VisionEncoderDecoderModel

    print(f"Loading model from {model_dir}...")
    processor = DonutProcessor.from_pretrained(model_dir)
    model = VisionEncoderDecoderModel.from_pretrained(model_dir)
    model.eval()

    os.makedirs(onnx_output, exist_ok=True)
    encoder_path = os.path.join(onnx_output, "encoder.onnx")

    dummy_image = torch.randn(1, 3, 1280, 960)
    print("Exporting vision encoder to ONNX...")
    torch.onnx.export(
        model.encoder,
        dummy_image,
        encoder_path,
        input_names=["pixel_values"],
        output_names=["last_hidden_state"],
        dynamic_axes={"pixel_values": {0: "batch_size"}, "last_hidden_state": {0: "batch_size"}},
        opset_version=14
    )
    print(f"Vision encoder exported to: {encoder_path}")

    # Save tokenizer / processor configs alongside ONNX model
    processor.save_pretrained(onnx_output)
    print(f"ONNX packaging complete at: {onnx_output}")

if __name__ == "__main__":
    import sys
    src = sys.argv[1] if len(sys.argv) > 1 else "ml/model_checkpoint"
    dst = sys.argv[2] if len(sys.argv) > 2 else "ml/model_onnx"
    if os.path.exists(src):
        export_to_onnx(src, dst)
    else:
        print(f"Source model dir not found: {src}")
