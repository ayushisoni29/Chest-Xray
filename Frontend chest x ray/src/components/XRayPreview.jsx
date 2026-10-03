import React from "react";
import { ScanLine } from "lucide-react";

function XRayPreview({ image, compact = false }) {
  return (
    <div className={`xray-preview ${compact ? "compact" : ""}`}>

      {image ? (
        <img
          src={image}
          alt="Chest X-ray preview"
          className="xray-image"
        />
      ) : (
        <div className="xray-placeholder">

          <div className="xray-grid"></div>

          <div className="xray-lungs">

            <div className="lung lung-left"></div>

            <div className="spine"></div>

            <div className="lung lung-right"></div>

          </div>

          <div className="xray-label">
            <ScanLine size={14} />
            CHEST / PA
          </div>

          <div className="xray-status">
            READY
          </div>

        </div>
      )}

      {!compact && (
        <div className="xray-caption">
          <span>CHEST RADIOGRAPH</span>
          <span>PA VIEW</span>
        </div>
      )}

    </div>
  );
}

export default XRayPreview;