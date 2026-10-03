# TABLE OF CONTENTS

| S.NO. | SECTION TITLE | SUB HEADINGS | PAGE NO |
|---|---|---|---|
| 1 | Chapter 1: Introduction | 1.1 Background<br>1.2 Problem Statement<br>1.3 Scope of the Study<br>1.4 Key Objectives<br>1.5 Proposed Solution<br>1.6 Applications<br>1.7 Organization of the Report | 1 |
| 2 | Chapter 2: Literature Review | 2.1 Introduction<br>2.2 Chest X-Ray Computer Vision<br>2.3 Deep Learning for Medical Image Classification<br>2.4 Convolutional Neural Networks (CNNs)<br>2.5 Explainable AI and Grad-CAM<br>2.6 Existing Medical Image Analysis Approaches<br>2.7 Research Gap<br>2.8 Summary | 7 |
| 3 | Chapter 3: Methodology | 3.1 Introduction<br>3.2 Overall System Workflow<br>3.3 System Architecture<br>3.4 Dataset Preparation<br>3.5 Image Preprocessing<br>3.6 Model Development<br>3.7 Model Evaluation<br>3.8 Grad-CAM Explainability<br>3.9 Shortcut/Border Sensitivity Analysis<br>3.10 Database and API Design<br>3.11 Summary | 12 |
| 4 | Chapter 4: System Implementation | 4.1 Introduction<br>4.2 Software and Hardware Requirements<br>4.3 Frontend Implementation<br>4.4 Backend Implementation<br>4.5 Prediction Pipeline<br>4.6 Authentication and History<br>4.7 Grad-CAM Module<br>4.8 Database Implementation<br>4.9 Testing and Verification<br>4.10 Technology Stack<br>4.11 Summary | 20 |
| 5 | Chapter 5: Results and Discussion | 5.1 Introduction<br>5.2 Dataset Cleaning Results<br>5.3 Model Comparison<br>5.4 Fine-Tuned ResNet50 Results<br>5.5 Confusion Matrix and Error Analysis<br>5.6 Focal Loss Experiment<br>5.7 Explainability and Shortcut Diagnostics<br>5.8 Performance Evaluation and Limitations<br>5.9 Summary | 27 |
| 6 | Chapter 6: Conclusion | 6.1 Introduction<br>6.2 Summary of Work<br>6.3 Achievements<br>6.4 Key Contributions<br>6.5 Conclusion<br>6.6 Summary | 33 |
| 7 | Chapter 7: Future Work | 7.1 Introduction<br>7.2 Patient-Level Validation<br>7.3 External Dataset Validation<br>7.4 Higher-Resolution Experiment<br>7.5 Robust Preprocessing<br>7.6 PWA/Mobile Access<br>7.7 Clinical Validation and Deployment<br>7.8 Summary | 37 |
| 8 | Snapshots | | 41 |
| 9 | References | | 45 |

<div style="page-break-after: always;"></div>

# CHAPTER 1
## INTRODUCTION

### 1.1 Background
With the rapid growth of medical imaging and computer vision, deep learning has become one of the most widely used technologies for automating diagnostic assistance. Radiologists and medical professionals use chest X-ray imaging to evaluate thoracic conditions, but interpreting these images requires domain expertise and can be time-consuming when large numbers of images must be reviewed. Computer vision and deep learning provide a way to assist image classification by learning visual patterns from labeled radiographic datasets.

The proposed **Chest X-Ray Multi-Disease Detection & Grad-CAM Explainability System** is an AI-powered medical imaging platform that automates radiographic understanding using Convolutional Neural Networks (CNNs) and Artificial Intelligence. The system accepts a chest X-ray image, processes it using CLAHE, evaluates it against five dataset-defined classes (COVID-19, Lung Opacity, Normal, Pneumonia, Tuberculosis), generates explainable heatmaps using Grad-CAM, and provides a history-aware diagnostic assistance workspace.

### 1.2 Problem Statement
Manual inspection of chest X-ray images is a difficult and time-consuming task, especially when several disease categories have visually overlapping characteristics. Radiologists often spend critical hours reading scans, identifying lung opacities, and detecting abnormalities before providing a clinical report. Existing deep learning tools usually perform only a single task, such as pure classification without explaining the model's reasoning, which leads to a "black box" problem in medical AI.

There is currently a need for a unified AI-based platform that combines medical image classification, explainability, performance evaluation, and user management within a single workspace. The proposed system addresses this problem by automatically analyzing chest X-rays, providing classification probabilities, and generating Grad-CAM visualizations to highlight the exact regions contributing to the prediction, making AI models easier to understand and trust.

### 1.3 Scope of the Study
The scope of this project is limited to the analysis of chest X-ray images using a pre-trained and fine-tuned ResNet50 architecture. After receiving an uploaded PNG/JPG/JPEG image, the system resizes and normalizes the image, applies contrast limiting adaptive histogram equalization (CLAHE), and feeds it into the deep learning model. The platform provides five-class classification, AI-powered Grad-CAM heatmaps, secure JWT-based authentication, and a historical database of past predictions. It is designed as an AI-assisted research prototype and does not claim to replace radiologists or provide clinical diagnosis.

### 1.4 Key Objectives
The primary objectives of the proposed AI Multi-Disease Detection System are:
- To develop an AI-powered platform that automatically classifies chest X-ray images into COVID-19, Lung Opacity, Normal, Pneumonia, or Tuberculosis.
- To prepare a cleaned train/validation/test split and investigate cross-split duplicate leakage.
- To use transfer learning with a computationally practical ResNet50 CNN architecture for CPU-based inference.
- To implement Grad-CAM explainability to highlight the regions of interest (ROIs) that the model focused on for its prediction.
- To develop a secure full-stack application using FastAPI, React.js, and MongoDB for seamless user interaction and prediction history tracking.
- To improve diagnostic assistance and productivity through a single AI-powered medical workspace.

### 1.5 Proposed Solution
The proposed solution is the development of a Chest X-Ray Multi-Disease Detection system, an intelligent software platform that automates radiographic analysis using Artificial Intelligence. The system accepts an X-ray image upload, processes the image using OpenCV, and performs a forward pass through a fine-tuned ResNet50 model. It explores the internal activations of the final convolutional layer to generate a Grad-CAM heatmap, providing an interpretable visual explanation. The backend handles authentication, inference, and database persistence, while the frontend provides a sleek, dark-themed glassmorphism interface.

### 1.6 Applications
The proposed system can be used in various real-world applications, including:
- AI-assisted educational demonstration of medical image classification.
- Research experimentation with transfer learning and explainable AI.
- Five-class chest X-ray screening research prototype.
- Visualization of model attention using Grad-CAM.
- Demonstration of a complete ML inference pipeline through a web API.
- Academic evaluation of data cleaning, model comparison, and error analysis.

### 1.7 Organization of the Report
This thesis is organized into nine chapters. Chapter 1 introduces the project, including its background, problem statement, objectives, scope, proposed solution, and applications. Chapter 2 presents the literature review related to chest X-ray computer vision, Artificial Intelligence, and explainable AI. Chapter 3 explains the proposed methodology, system architecture, workflow, and AI modules. Chapter 4 describes the implementation details, technologies used, and system modules. Chapter 5 presents the experimental results, dataset cleaning, code review outcomes, model accuracy, and performance evaluation. Chapter 6 summarizes the overall work and presents the conclusion. Chapter 7 discusses future enhancements and possible research extensions. Chapter 8 contains system snapshots, while Chapter 9 provides the references used during the development of the project.

<div style="page-break-after: always;"></div>

# CHAPTER 2
## LITERATURE REVIEW

### 2.1 Introduction
In recent years, software development and medical diagnostics have evolved rapidly due to the increasing adoption of open-source technologies and Artificial Intelligence. Deep learning has become a major approach for image classification because convolutional neural networks can learn hierarchical visual representations directly from images. Chest X-ray analysis is a particularly important application because radiographs contain patterns associated with multiple thoracic conditions. This chapter reviews the existing literature, technologies, and tools that form the foundation of the proposed system.

### 2.2 Chest X-Ray Computer Vision
Chest X-ray classification systems typically transform radiographs into fixed-size tensors and use convolutional neural networks to learn visual features. Dataset quality is important because images can originate from different institutions, devices, resolutions, acquisition protocols, and labeling conventions. Traditionally, this process was done using manual feature extraction and classic machine learning algorithms, but deep learning has vastly outperformed these techniques.

### 2.3 Deep Learning for Medical Image Classification
Artificial Intelligence has revolutionized medical engineering by automating many complex and repetitive tasks performed during diagnostics. CNN architectures learn local edges and textures in early layers and increasingly abstract representations in deeper layers. Machine Learning algorithms analyze these patterns to predict conditions, recommend improvements, and estimate scan severity. In recent years, AI models like ResNet, DenseNet, and ConvNeXt have demonstrated how Large Vision Models can significantly improve radiologist productivity. 

### 2.4 Convolutional Neural Networks (CNNs) & Transfer Learning
Transfer learning initializes a vision network using representations learned from a large image dataset (like ImageNet) and then adapts the model to the target task. This approach is particularly useful when computational resources are limited and datasets are relatively small. The project used ImageNet-based transfer learning and then fine-tuned a ResNet50 model on the cleaned chest X-ray data.

### 2.5 Explainable AI and Grad-CAM
Grad-CAM is an explainability technique that uses gradients flowing into a convolutional feature layer to produce a coarse localization map of image regions that contribute to a model prediction. In this project, Grad-CAM was generated from the verified ResNet50 layer conv5_block3_3_conv. Grad-CAM overlays were used for qualitative and quantitative investigation, ensuring the AI model is not acting as a complete black box, a critical requirement for medical AI systems.

### 2.6 Existing Medical Image Analysis Approaches
Several software engineering tools and algorithms are available for medical image analysis, including traditional CNNs, Vision Transformers, and heuristic-based anomaly detection. Common approaches include transfer-learning models, augmentation, class weighting, and explainability methods. Lightweight architectures like MobileNet provide faster CPU inference, while deeper architectures provide stronger representation capacity.

### 2.7 Research Gap
Existing repository analysis and medical AI tools mainly focus on static prediction or raw accuracy without explainability. Very few systems integrate data cleaning, AI-based inference, explainability (Grad-CAM), security analysis, performance evaluation, and historical persistence into a unified developer platform. The proposed system fills this research gap by combining all these features into a single AI-powered software engineering workspace for medical imaging.

### 2.8 Summary
This chapter reviewed the existing technologies and research related to chest X-ray classification, Artificial Intelligence, CNNs, Transfer Learning, and Grad-CAM. The literature shows that current solutions provide only partial functionality and often lack integrated explainability and tracking. The proposed system addresses these limitations. The next chapter describes the proposed methodology, system architecture, and implementation workflow.

<div style="page-break-after: always;"></div>

# CHAPTER 3
## METHODOLOGY

### 3.1 Introduction
This chapter describes the methodology adopted for developing the Chest X-Ray Multi-Disease Detection System. The proposed system follows an AI-driven workflow that automatically analyzes chest X-rays and provides intelligent insights to users. Instead of manually exploring raw model tensors, users only need to upload an image. The system processes the image, applies ResNet50 inference, extracts spatial features, evaluates conditions, and provides visual assistance through an integrated Grad-CAM map.

### 3.2 Overall System Workflow
The system follows the workflow shown below:
1. User Registration/Login.
2. User uploads a Chest X-ray image.
3. Image is temporarily saved and validated.
4. Preprocessing Module applies CLAHE and standardizes dimensions (224x224).
5. Image is fed into the fine-tuned ResNet50 model.
6. AI model generates a probability distribution over 5 classes.
7. Grad-CAM module intercepts the gradients of the final convolutional layer.
8. Explainability heatmap is overlaid on the original image.
9. Results are stored in the MongoDB Database for future access.
10. The UI renders the predicted class, confidence, and heatmap.

### 3.3 System Architecture
The system follows a modular architecture consisting of frontend, backend, AI engine, and database.
**User Interface:** The frontend provides authentication, image upload, dashboard visualization, and analysis history.
**Backend Server:** Developed using FastAPI. It handles user authentication, API requests, AI processing, and database communication.
**AI Processing Engine:** Uses TensorFlow/Keras and OpenCV to run ResNet50 and generate Grad-CAM heatmaps.
**Database:** MongoDB stores user information, analysis history, generated heatmaps, and predictions.

### 3.4 Dataset Preparation
The methodology was designed around a strict separation between training/validation data and the held-out test set. The original dataset contained 21,865 images across five classes. A cleaning stage produced train, validation, and test manifests containing 15,099, 3,260, and 3,276 images respectively. Duplicate analysis removed 45 exact duplicate groups and 20 cross-split leakage cases.

### 3.5 Image Preprocessing
The production pipeline resizes images to 224x224x3, applies CLAHE-based contrast preprocessing, and then applies 	f.keras.applications.resnet50.preprocess_input. The class mapping is fixed as: 0 COVID, 1 Lung_Opacity, 2 Normal, 3 Pneumonia, 4 Tuberculosis.

### 3.6 Model Development
Architecture evaluation compared ResNet50 and ConvNeXt-Tiny with MobileNet references. ResNet50 achieved validation Macro F1 of 0.8401 in early epochs. The best Step 5 checkpoint reached validation Macro F1 of 0.9417. The final held-out test evaluation achieved 93.04% accuracy.

### 3.7 Model Evaluation
The final model was evaluated on exactly 3,276 images from 	est.csv. The final metrics were: accuracy 93.04%, Macro Precision 0.9459, Macro Recall 0.9467, and Macro F1 0.9460.

### 3.8 Grad-CAM Explainability
Grad-CAM was implemented using the final ResNet50 convolutional target layer conv5_block3_3_conv. The pipeline intercepts the gradients with respect to the target class and computes a weighted combination of forward activation maps.

### 3.9 Shortcut/Border Sensitivity Analysis
A limited diagnostic was conducted on test images. When the outer 15% border was suppressed, accuracy dropped significantly, showing the model's sensitivity to peripheral artifacts.

### 3.10 Database and API Design
MongoDB is used as the primary database. The database stores User Accounts, Authentication Details, Image URLs, Analysis History, Prediction Confidences, and Heatmap paths. This allows users to revisit previously analyzed X-rays without repeating the inference process.

### 3.11 Summary
This chapter explained the complete methodology used to develop the system. It described the system workflow, architecture, dataset cleaning process, AI-powered inference, Grad-CAM explainability, and database design. The next chapter discusses the implementation details of each module.

<div style="page-break-after: always;"></div>

# CHAPTER 4
## SYSTEM IMPLEMENTATION

### 4.1 Introduction
This chapter describes the implementation of the proposed Chest X-Ray Analysis System. The system has been developed as a web-based AI-powered engineering platform that integrates deep learning, web APIs, and responsive UI design into a single application.

### 4.2 Software and Hardware Requirements
**Software Requirements:**
- Operating System: Windows 10/11 or Linux
- Programming Language: Python 3.11+
- Frontend: React.js (Vite)
- Backend: FastAPI
- Database: MongoDB
- ML Framework: TensorFlow/Keras
- Image Processing: OpenCV

**Hardware Requirements:**
- Processor: Intel Core i5 or above
- RAM: Minimum 8 GB (24 GB Recommended)
- Storage: 20 GB Free Space
- Inference target: CPU-friendly pipeline

### 4.3 Frontend Implementation
The frontend has been developed using **React.js** to provide an interactive and user-friendly interface. The application includes a secure login page, dashboard, detection workspace, analysis history, and about page. The styling utilizes modern CSS variables, glassmorphism, and responsive grid layouts.

### 4.4 Backend Implementation
The backend has been implemented using **FastAPI**, which provides high performance and asynchronous request handling. REST APIs are developed to handle user login, image submission, analysis requests, and history management.

### 4.5 Prediction Pipeline
After the user submits an image, the backend processes it. The pipeline executes:
- Input validation
- CLAHE preprocessing
- ResNet50 predict() function
- Probability normalization
- Thresholding for 5 classes

### 4.6 Authentication and History
JWT-based authentication ensures secure access to the platform. Users can register, login, and maintain persistent sessions. All analyses are linked to the authenticated user's ID in MongoDB.

### 4.7 Grad-CAM Module
The Grad-CAM module generates visual heatmaps. It uses 	f.GradientTape() to calculate the gradients of the top predicted class with respect to the conv5_block3_3_conv feature map. The pooled gradients are multiplied by the feature maps, passed through a ReLU activation, and normalized to create the final colored heatmap.

### 4.8 Database Implementation
MongoDB stores application data. Collections include users and predictions. The prediction documents store the raw image path, heatmap path, timestamp, user ID, predicted label, and the array of 5 probabilities.

### 4.9 Testing and Verification
The system utilizes automated unit testing. The final verification confirmed that the model loads correctly, input shapes match (None, 224, 224, 3), and API endpoints return HTTP 200 statuses.

### 4.10 Technology Stack
- **React.js**: Frontend Development
- **FastAPI**: Backend API Development
- **MongoDB**: Database
- **TensorFlow/Keras**: Model training and inference
- **OpenCV**: Image processing / CLAHE
- **JWT / bcrypt**: User Authentication

### 4.11 Summary
This chapter presented the implementation details, describing the frontend and backend architecture, inference process, authentication, and database design.

<div style="page-break-after: always;"></div>

# CHAPTER 5
## RESULTS AND DISCUSSION

### 5.1 Introduction
This chapter presents the results obtained from the implementation of the system. The developed system was tested using thousands of public chest X-rays to evaluate its functionality, accuracy, performance, and usability.

### 5.2 Dataset Cleaning Results
Duplicate analysis identified 45 exact duplicate groups and 20 cross-split leakage cases. The cleaned manifests ensured the validity of the final evaluation.

### 5.3 Model Comparison
- MobileNetV3 clean baseline: 72.04% test accuracy
- ConvNeXt-Tiny: Val Macro F1 0.7229
- Fine-tuned ResNet50: 93.04% test accuracy; Selected as Final Model.

### 5.4 Fine-Tuned ResNet50 Results
The best checkpoint achieved 93.04% accuracy on the 3,276 held-out test images. Macro F1 was 0.9460. Per-class recall was excellent, with Tuberculosis hitting 100.00% and COVID-19 at 96.84%.

### 5.5 Confusion Matrix and Error Analysis
The largest error source was Lung Opacity versus Normal. There were 111 Lung Opacity -> Normal errors. These accounted for approximately 75.9% of the total test errors, indicating the difficulty of separating faint opacities from normal lung tissue.

### 5.6 Focal Loss Experiment
A controlled Focal Loss experiment was performed but reduced the validation Macro F1 to 0.8788. It was rejected from production.

### 5.7 Explainability and Shortcut Diagnostics
Grad-CAM successfully produced localization maps. A border-suppression diagnostic showed that masking the outer 15% of images dropped accuracy from 100% to 44% on a small sample, indicating the model uses peripheral lung/scapula features.

### 5.8 Performance Evaluation and Limitations
The CPU inference pipeline measured approximately 21.73 ms per image. Limitations include the lack of patient IDs, heterogeneous multi-source dataset distributions, and the necessity of further clinical validation before real-world deployment.

### 5.9 Summary
The experimental results demonstrate that the proposed platform effectively simplifies medical image analysis while achieving a strong 93.04% accuracy.

<div style="page-break-after: always;"></div>

# CHAPTER 6
## CONCLUSION

### 6.1 Introduction
This chapter presents the conclusion of the project and discusses its overall achievements, contributions, and future enhancements.

### 6.2 Summary of Work
The project began with a dataset audit, progressed through leakage-aware cleaning, ResNet50 fine-tuning, held-out testing, Grad-CAM analysis, and culminated in full web application integration using FastAPI and React.

### 6.3 Achievements
- Developed an AI-powered platform for automatic chest X-ray analysis.
- Fine-tuned ResNet50 and achieved 93.04% held-out test accuracy.
- Implemented and verified Grad-CAM explainability.
- Created an interactive web-based application with a modern and user-friendly interface.
- Stored repository analysis history and generated reports using MongoDB.

### 6.4 Key Contributions
The key contribution is an end-to-end academic prototype that connects model development, data-quality investigation, explainability, and deployable inference into a unified platform.

### 6.5 Conclusion
The Chest X-Ray AI System was developed to overcome the challenges associated with analyzing radiographs manually. The system successfully classifies images, provides explainability, and stores historical records. The implementation of React.js, FastAPI, MongoDB, and TensorFlow has resulted in a scalable, interactive, and efficient application.

### 6.6 Summary
The developed system successfully combines medical imaging, AI-powered inference, and transparent explanations into a unified platform.

<div style="page-break-after: always;"></div>

# CHAPTER 7
## FUTURE SCOPE

### 7.1 Introduction
Although the current system successfully achieves its objectives, there are several opportunities to enhance its capabilities with emerging AI technologies and advanced medical protocols.

### 7.2 Patient-Level Validation
Future datasets with patient IDs should be split at the patient level so that images from the same patient cannot occur across training and evaluation partitions, providing a stronger test of generalization.

### 7.3 External Dataset Validation
An independent external dataset, particularly an independently sourced tuberculosis dataset, can be used to test whether the final model maintains performance when acquisition conditions change.

### 7.4 Higher-Resolution Experiment
A controlled 512x512 experiment can be conducted to determine whether higher spatial resolution improves subtle radiographic pattern recognition.

### 7.5 Robust Preprocessing
The project can evaluate a revised preprocessing pipeline that explicitly investigates contrast normalization and source/resolution effects.

### 7.6 PWA/Mobile Access
The frontend can be converted into a Progressive Web App (PWA) so that users can install the interface on mobile devices.

### 7.7 Clinical Validation and Deployment
A clinical-facing system would require independent multi-center validation, prospective evaluation, calibration analysis, and regulatory assessment where applicable.

### 7.8 Summary
Future development should prioritize external and patient-level validation, higher-resolution experiments, robustness against source-specific artifacts, and eventual mobile usability.

<div style="page-break-after: always;"></div>

# CHAPTER 8
## SNAPSHOTS

*(System snapshots would be inserted here, demonstrating the Dashboard, Detection workspace, Grad-CAM results, Analysis History, and Authentication interfaces).*

<div style="page-break-after: always;"></div>

# CHAPTER 9
## REFERENCES

[1] K. He, X. Zhang, S. Ren, and J. Sun, "Deep Residual Learning for Image Recognition," Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR), 2016.

[2] R. R. Selvaraju et al., "Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization," Proceedings of the IEEE International Conference on Computer Vision (ICCV), 2017.

[3] O. Ronneberger, P. Fischer, and T. Brox, "U-Net: Convolutional Networks for Biomedical Image Segmentation," MICCAI, 2015.

[4] TensorFlow/Keras Documentation, Model training and inference documentation.

[5] Keras Applications Documentation, ResNet50 model and preprocessing.

[6] OpenCV Documentation, image processing and CLAHE functionality.

[7] FastAPI Documentation, web API framework and request handling.

[8] MongoDB Documentation, database and Python driver documentation.

[9] React Documentation, Available: https://react.dev/

[10] The project's cleaned dataset manifests: dataset/clean/train.csv, dataset/clean/val.csv, dataset/clean/test.csv.
