import os
import glob
import pandas as pd
from sklearn.model_selection import train_test_split

dataset_dir = r"d:\7TH SEM MAJOR F\Major project 7th sem\dataset"
output_dir = os.path.join(dataset_dir, "clean")
os.makedirs(output_dir, exist_ok=True)

classes = ["COVID", "Lung_Opacity", "Normal", "Pneumonia", "Tuberculosis"]
data = []

for c in classes:
    class_dir = os.path.join(dataset_dir, c)
    if os.path.exists(class_dir):
        files = glob.glob(os.path.join(class_dir, "*.png")) + glob.glob(os.path.join(class_dir, "*.jpg")) + glob.glob(os.path.join(class_dir, "*.jpeg"))
        for f in files:
            # Create a RELATIVE path that works on both Laptop and Google Colab
            rel_path = f"dataset/{c}/{os.path.basename(f)}"
            data.append({"filepath": rel_path, "label": c, "class_name": c})

df = pd.DataFrame(data)

# Split 70-15-15
train_df, temp_df = train_test_split(df, test_size=0.3, stratify=df['label'], random_state=42)
val_df, test_df = train_test_split(temp_df, test_size=0.5, stratify=temp_df['label'], random_state=42)

train_df.to_csv(os.path.join(output_dir, "train.csv"), index=False)
val_df.to_csv(os.path.join(output_dir, "val.csv"), index=False)
test_df.to_csv(os.path.join(output_dir, "test.csv"), index=False)

print("CSVs updated with relative paths for Colab!")
