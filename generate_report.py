import os
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "final_super_model_v3.keras")
TEST_CSV_PATH = os.path.join(BASE_DIR, "dataset", "clean", "test.csv")
CLASSES = ["COVID", "Lung_Opacity", "Normal", "Pneumonia", "Tuberculosis"]

print("1. Loading Model...")
model = tf.keras.models.load_model(MODEL_PATH)

print("2. Loading Test Dataset...")
test_df = pd.read_csv(TEST_CSV_PATH)

datagen = tf.keras.preprocessing.image.ImageDataGenerator(rescale=1./255)
test_gen = datagen.flow_from_dataframe(
    dataframe=test_df,
    x_col="filepath",
    y_col="class_name",
    target_size=(224, 224),
    batch_size=32,
    classes=CLASSES,
    class_mode="categorical",
    shuffle=False
)

print("3. Evaluating Model (Testing on unseen images)...")
predictions = model.predict(test_gen)
y_pred = np.argmax(predictions, axis=1)
y_true = test_gen.classes

# Accuracy
acc = np.mean(y_pred == y_true)
print(f"\n==========================================")
print(f"FINAL MODEL ACCURACY: {acc * 100:.2f}%")
print(f"==========================================\n")

print("4. Generating Classification Report...")
print(classification_report(y_true, y_pred, target_names=CLASSES))

# Confusion Matrix
print("5. Saving Confusion Matrix Graph...")
cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=CLASSES, yticklabels=CLASSES)
plt.title(f'Confusion Matrix (Accuracy: {acc * 100:.2f}%)')
plt.ylabel('Actual Condition')
plt.xlabel('Predicted Condition')
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, "new_accuracy_report.png"))
print("Done! Check 'new_accuracy_report.png' in your project folder.")
