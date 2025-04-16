import React from "react";
import "../ModernPages.css";

function BayesianCNNPage() {
  return (
    <div className="page-container">
      <div className="section">
        <h2 className="section-title">Bayesian CNN for CIFAR-10 Image Classification</h2>
        <p className="section-content">
          This project implements a Simplified Bayesian Convolutional Neural Network (CNN) using TensorFlow and TensorFlow Probability to classify CIFAR-10 images while quantifying uncertainty.
        </p>
        <h3 className="section-subtitle">Key Features</h3>
        <ul className="section-content">
          <li>
            <strong>Uncertainty Estimation:</strong> Incorporates DenseFlipout layers and Monte Carlo sampling.
          </li>
          <li>
            <strong>Data Augmentation:</strong> Uses ImageDataGenerator for improved generalization.
          </li>
          <li>
            <strong>Robust Architecture:</strong> Combines convolutional layers with Bayesian dense layers and dropout.
          </li>
          <li>
            <strong>Benchmarking:</strong> Compares against MobileNetV2 and ResNet50 for performance.
          </li>
        </ul>
        <h3 className="section-subtitle">Model Overview</h3>
        <pre>{`
Input: 32x32 RGB Image (CIFAR-10)
 ├─ Conv2D (32 filters, ReLU) → BatchNorm → MaxPooling
 ├─ Conv2D (64 filters, ReLU) → BatchNorm → MaxPooling
 ├─ Conv2D (128 filters, ReLU) → BatchNorm → MaxPooling
 ├─ Flatten → DenseFlipout (128 units, ReLU) → Dropout (40%)
 └─ DenseFlipout (10 classes, Softmax)
        `}</pre>
        <h3 className="section-subtitle">Learn More</h3>
        <p className="section-content">
          For full code details, please visit the repository:{" "}
          <a
            href="https://github.com/jadenfix/Bayesian-Neural-Network-for-CIFAR-10-Image-Classification"
            target="_blank"
            rel="noopener noreferrer"
          >
            Bayesian CNN on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}

export default BayesianCNNPage;