import urllib.request
import urllib.parse
import json
import os

def run_verification():
    # 1. Create a sample dirty CSV file
    sample_csv_content = """age,income,gender,signup_date,churn
25,50000,M,2023-01-15,0
30,80000,F,2023-02-20,0
45,120000,F,2023-03-05,1
22,30000,M,2023-04-12,1
35,60000,M,2023-05-18,0
30,80000,F,2023-02-20,0
,75000,M,2023-06-25,0
35,,F,2023-07-30,1
150,60000,M,2023-08-14,0
"""
    csv_filename = "test_sample.csv"
    with open(csv_filename, "w") as f:
        f.write(sample_csv_content)
    print(f"Created temporary dirty CSV file: {csv_filename}")

    try:
        # 2. Upload the file
        # Construct multipart/form-data upload using standard urllib
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        data = []
        data.append(f"--{boundary}".encode('utf-8'))
        data.append(f'Content-Disposition: form-data; name="file"; filename="{csv_filename}"'.encode('utf-8'))
        data.append(b'Content-Type: text/csv')
        data.append(b'')
        with open(csv_filename, 'rb') as f:
            data.append(f.read())
        data.append(f"--{boundary}--".encode('utf-8'))
        data.append(b'')
        
        body = b'\r\n'.join(data)
        
        upload_url = "http://localhost:8000/api/v1/data/upload"
        req = urllib.request.Request(upload_url, data=body, method='POST')
        req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
        
        print("Uploading sample CSV...")
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            print("Upload response:")
            print(json.dumps(res_data, indent=2))
            
        file_id = res_data["file_id"]
        
        # 3. Trigger analysis
        analyze_url = "http://localhost:8000/api/v1/data/analyze"
        analyze_payload = json.dumps({"file_id": file_id}).encode('utf-8')
        req_analyze = urllib.request.Request(analyze_url, data=analyze_payload, method='POST')
        req_analyze.add_header('Content-Type', 'application/json')
        
        print("\nTriggering analysis...")
        with urllib.request.urlopen(req_analyze) as response:
            res_analyze = json.loads(response.read().decode('utf-8'))
            print("Analyze response:")
            print(json.dumps(res_analyze, indent=2))
            
        # 3.5. Trigger tuning
        tune_url = "http://localhost:8000/api/v1/data/tune"
        tune_payload = json.dumps({"file_id": file_id, "n_trials": 10}).encode('utf-8')
        req_tune = urllib.request.Request(tune_url, data=tune_payload, method='POST')
        req_tune.add_header('Content-Type', 'application/json')
        
        print("\nTriggering hyperparameter tuning...")
        with urllib.request.urlopen(req_tune) as response:
            res_tune = json.loads(response.read().decode('utf-8'))
            print("Tune response:")
            print(json.dumps(res_tune, indent=2))

        # 3.7. Trigger explainability
        explain_url = "http://localhost:8000/api/v1/data/explain"
        explain_payload = json.dumps({"file_id": file_id}).encode('utf-8')
        req_explain = urllib.request.Request(explain_url, data=explain_payload, method='POST')
        req_explain.add_header('Content-Type', 'application/json')
        
        print("\nTriggering model explainability (SHAP)...")
        with urllib.request.urlopen(req_explain) as response:
            res_explain = json.loads(response.read().decode('utf-8'))
            print("Explain response:")
            print(json.dumps(res_explain, indent=2))

        # 4. Get report and download
        report_url = f"http://localhost:8000/api/v1/data/report/{file_id}"
        print(f"\nFetching report metadata for file_id: {file_id}...")
        with urllib.request.urlopen(report_url) as response:
            res_report = json.loads(response.read().decode('utf-8'))
            print("Report metadata response:")
            print(json.dumps(res_report, indent=2))
            
        # Download PDF
        pdf_download_url = f"http://localhost:8000/api/v1/data/report/download/{file_id}/pdf"
        print(f"Downloading PDF report...")
        with urllib.request.urlopen(pdf_download_url) as response:
            pdf_bytes = response.read()
            print(f"Downloaded PDF size: {len(pdf_bytes)} bytes")
            
        # Download PPTX
        pptx_download_url = f"http://localhost:8000/api/v1/data/report/download/{file_id}/pptx"
        print(f"Downloading PPTX presentation...")
        with urllib.request.urlopen(pptx_download_url) as response:
            pptx_bytes = response.read()
            print(f"Downloaded PPTX size: {len(pptx_bytes)} bytes")
            
    except Exception as e:
        print(f"Verification failed: {e}")
        if hasattr(e, 'read'):
            print("Error details:", e.read().decode('utf-8'))
    finally:
        # Clean up temporary CSV
        if os.path.exists(csv_filename):
            os.remove(csv_filename)
            print(f"Cleaned up temporary CSV: {csv_filename}")

if __name__ == "__main__":
    run_verification()
