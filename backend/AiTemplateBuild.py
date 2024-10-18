import torch
from transformers import LayoutLMv2ForTokenClassification, LayoutLMv2FeatureExtractor, LayoutLMv2Tokenizer
from PIL import Image
import io
import sys

# Adding the path to your custom module
sys.path.append("F:/repogit/XseLLer8/Category_Transformer/category_transformer")

from model import GPT  # Import the custom model from model.py
from tabular_config import TabularConfig  # Import the configuration class

# Function to load the image
def load_image(image_path):
    with open(image_path, "rb") as f:
        image = Image.open(io.BytesIO(f.read()))
    return image

# Load the image
image_path = "F:/repogit/XseLLer8/uploads/BEK.png"
image = load_image(image_path)

# LayoutLMv2 part for extracting text features
layoutlmv2_feature_extractor = LayoutLMv2FeatureExtractor()
layoutlmv2_tokenizer = LayoutLMv2Tokenizer.from_pretrained("microsoft/layoutlmv2-base")
inputs = layoutlmv2_feature_extractor(image, return_tensors="pt")
tokenized_inputs = layoutlmv2_tokenizer(image, truncation=True, padding=True, return_tensors="pt")
layoutlmv2_model = LayoutLMv2ForTokenClassification.from_pretrained("microsoft/layoutlmv2-base", num_labels=10)

# Forward pass through LayoutLMv2
outputs = layoutlmv2_model(**inputs)
layoutlmv2_predictions = outputs.logits.argmax(-1)
predicted_text = layoutlmv2_tokenizer.decode(layoutlmv2_predictions[0])

# Set up the custom tabular model configuration
config = TabularConfig(
    output_size=12,  # Adjust based on your classification task
    n_layer=8,
    n_head=32,
    n_embd=128,
    n_features=14,
    dropout=0.2,
    bias=True,
    classification_weights=torch.tensor([1.0, 1.0, 1.0, 1.0])
)

# Initialize the custom GPT model
custom_model = GPT(config)

# Load the pretrained weights for the custom model if available
model_path = "path/to/your/saved_model.pth"  # Replace with actual path
custom_model.load_state_dict(torch.load(model_path))
custom_model.eval()

# Prepare the inputs for the custom model
# Assuming the predicted_text from LayoutLMv2 can be tokenized into features
# You need to preprocess predicted_text into the format required by your model
# For simplicity, let's assume `features` and `category_features` are derived from predicted_text
# Here you should implement the actual preprocessing based on your use case

# Example feature preparation (replace with actual data processing logic)
features = torch.randn(1, config.n_features)  # Replace with actual numerical features
category_features = [
    torch.randint(0, 4751, (1,)),  # Example vendor index
    torch.randint(0, 4, (1,)),     # Example booking year
    torch.randint(0, 4, (1,))      # Example document year
]

# Run inference
with torch.no_grad():
    logits, _ = custom_model(features, category_features)

# Get the predicted class
predicted_class = logits.argmax(-1).item()

# Print the predicted class
print("Predicted class:", predicted_class)
