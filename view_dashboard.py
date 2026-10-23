import os
import sys
import json
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from pymongo import MongoClient

PORT = 5050

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chest X-Ray AI — MongoDB Visual Explorer</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #090d16 0%, #0f172a 100%);
      color: #f1f5f9;
      padding: 32px;
      min-height: 100vh;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .header h1 {
      font-size: 26px;
      font-weight: 800;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      padding: 20px;
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    .stat-label { font-size: 13px; color: #94a3b8; margin-bottom: 6px; font-weight: 500; }
    .stat-val { font-size: 28px; font-weight: 800; color: #fff; }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .table-container {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 36px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: rgba(255, 255, 255, 0.04);
      padding: 14px 18px;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    td {
      padding: 14px 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
    }
    tr:hover { background: rgba(255, 255, 255, 0.02); }
    .class-tag {
      padding: 4px 8px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 11px;
      display: inline-block;
    }
    .tag-COVID { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .tag-Normal { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
    .tag-Tuberculosis { background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); }
    .tag-Lung_Opacity { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .tag-Pneumonia { background: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3); }
    .conf-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
      width: 100px;
    }
    .conf-fill { height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8); }
    .refresh-btn {
      padding: 8px 16px;
      background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Chest X-Ray AI — Visual Database Explorer</h1>
      <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Connected to local MongoDB (mongodb://localhost:27017)</p>
    </div>
    <div style="display: flex; gap: 12px; align-items: center;">
      <span class="badge">Live Local Database</span>
      <button class="refresh-btn" onclick="location.reload()">Refresh Data</button>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Registered Users</div>
      <div class="stat-val">__TOTAL_USERS__</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Predictions Saved</div>
      <div class="stat-val">__TOTAL_PREDS__</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">COVID-19 Detected</div>
      <div class="stat-val" style="color: #f87171;">__COVID_COUNT__</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Normal X-Rays</div>
      <div class="stat-val" style="color: #4ade80;">__NORMAL_COUNT__</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Tuberculosis Detected</div>
      <div class="stat-val" style="color: #facc15;">__TB_COUNT__</div>
    </div>
  </div>

  <div class="section-title">👥 Registered Users (__TOTAL_USERS__)</div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>User ID</th>
          <th>Full Name</th>
          <th>Email Address</th>
          <th>Registered At</th>
          <th>Scans Performed</th>
        </tr>
      </thead>
      <tbody>
        __USERS_ROWS__
      </tbody>
    </table>
  </div>

  <div class="section-title">🔬 Recent Predictions & Heatmaps (Showing latest 30 of __TOTAL_PREDS__)</div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Prediction ID</th>
          <th>Diagnosis</th>
          <th>Confidence</th>
          <th>Timestamp</th>
          <th>Associated User</th>
          <th>File Reference</th>
        </tr>
      </thead>
      <tbody>
        __PREDS_ROWS__
      </tbody>
    </table>
  </div>
</body>
</html>
"""

def generate_html():
    client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2000)
    db = client["chest_xray_ai"]
    users_col = db["users"]
    pred_col = db["predictions"]

    total_users = users_col.count_documents({})
    total_preds = pred_col.count_documents({})
    covid_count = pred_col.count_documents({"predicted_class": "COVID"})
    normal_count = pred_col.count_documents({"predicted_class": "Normal"})
    tb_count = pred_col.count_documents({"predicted_class": "Tuberculosis"})

    # Users rows
    users = list(users_col.find().sort("created_at", -1))
    user_rows = []
    for u in users:
        uid = str(u.get("_id"))
        name = u.get("name", "N/A")
        email = u.get("email", "N/A")
        created = str(u.get("created_at", "N/A"))[:19]
        scans = pred_col.count_documents({"user_id": uid})
        user_rows.append(f"""
        <tr>
          <td style="font-family: monospace; color: #94a3b8;">{uid}</td>
          <td style="font-weight: 600; color: #fff;">{name}</td>
          <td>{email}</td>
          <td style="color: #94a3b8;">{created}</td>
          <td><span class="badge" style="background: rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.1);">{scans} scans</span></td>
        </tr>
        """)

    # Prediction rows
    preds = list(pred_col.find().sort("timestamp", -1).limit(30))
    pred_rows = []
    for p in preds:
        pid = str(p.get("_id"))
        pclass = p.get("predicted_class", "Unknown")
        conf = float(p.get("confidence", 0.0))
        ts = str(p.get("timestamp", "N/A"))[:19]
        uid = p.get("user_id", "Anonymous")
        fname = p.get("image_filename", "N/A")
        conf_pct = f"{conf * 100:.1f}%"

        pred_rows.append(f"""
        <tr>
          <td style="font-family: monospace; color: #64748b;">{pid[:10]}...</td>
          <td><span class="class-tag tag-{pclass}">{pclass}</span></td>
          <td>
            {conf_pct}
            <div class="conf-bar"><div class="conf-fill" style="width: {conf * 100}%;"></div></div>
          </td>
          <td style="color: #94a3b8;">{ts}</td>
          <td style="font-family: monospace; font-size: 11px; color: #94a3b8;">{str(uid)[:12]}...</td>
          <td style="font-family: monospace; font-size: 11px; color: #64748b;">{fname}</td>
        </tr>
        """)

    html = HTML_TEMPLATE
    html = html.replace("__TOTAL_USERS__", str(total_users))
    html = html.replace("__TOTAL_PREDS__", str(total_preds))
    html = html.replace("__COVID_COUNT__", str(covid_count))
    html = html.replace("__NORMAL_COUNT__", str(normal_count))
    html = html.replace("__TB_COUNT__", str(tb_count))
    html = html.replace("__USERS_ROWS__", "".join(user_rows))
    html = html.replace("__PREDS_ROWS__", "".join(pred_rows))
    return html

class DashboardHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            content = generate_html().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            err = f"Error querying MongoDB: {e}".encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(err)

    def log_message(self, format, *args):
        pass # silent logs

def main():
    server = HTTPServer(("127.0.0.1", PORT), DashboardHandler)
    url = f"http://127.0.0.1:{PORT}"
    print(f"\n[+] Visual MongoDB Dashboard running at: {url}")
    print(f"[+] Opening browser automatically...")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping dashboard.")
        server.server_close()

if __name__ == "__main__":
    main()
