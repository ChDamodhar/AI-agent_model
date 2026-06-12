import os
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from app.agents.hyperparameter_tuning_agent import HyperparameterTuningAgent

def test_logistic_regression_tuning():
    print("Testing hyperparameter tuning safety with Logistic Regression...")
    
    # 1. Create a simple dummy classification dataset
    np.random.seed(42)
    X = np.random.randn(100, 4)
    y = np.random.randint(0, 2, size=100)
    
    df = pd.DataFrame(X, columns=[f"feature_{i}" for i in range(4)])
    df["target"] = y
    
    # 2. Fit a baseline Logistic Regression model
    model = LogisticRegression(random_state=42)
    X_train = df.drop(columns=["target"])
    y_train = df["target"]
    model.fit(X_train, y_train)
    
    # 3. Save the model to a temporary file
    temp_model_path = "temp_logistic_model.joblib"
    joblib.dump(model, temp_model_path)
    print(f"Saved baseline Logistic Regression model to {temp_model_path}")
    
    try:
        # 4. Instantiate and run HyperparameterTuningAgent
        agent = HyperparameterTuningAgent()
        tuned_model, best_params, tuning_report = agent.tune_model(
            df=df,
            target_column="target",
            model_path=temp_model_path,
            problem_type="classification",
            n_trials=5
        )
        
        # 5. Assertions
        print("Running assertions...")
        
        # Check type of returned model
        assert isinstance(tuned_model, LogisticRegression), "Returned model should be a LogisticRegression instance"
        
        # Check best params is empty
        assert best_params == {}, f"Best params should be empty for non-tree models, got {best_params}"
        
        # Check tuning report properties
        assert tuning_report["tunable"] is False, "Tuning report should mark the model as non-tunable"
        assert tuning_report["n_trials"] == 0, f"Number of trials should be 0, got {tuning_report['n_trials']}"
        assert tuning_report["model_name"] == "LogisticRegression", f"Model name should be LogisticRegression, got {tuning_report['model_name']}"
        
        print("\nAll assertions passed successfully! Safety verification complete.")
        print("Tuning Report details:")
        for k, v in tuning_report.items():
            print(f"  {k}: {v}")
            
    finally:
        # 6. Clean up temporary files
        if os.path.exists(temp_model_path):
            os.remove(temp_model_path)
            print(f"Cleaned up temporary model file: {temp_model_path}")

if __name__ == "__main__":
    test_logistic_regression_tuning()
