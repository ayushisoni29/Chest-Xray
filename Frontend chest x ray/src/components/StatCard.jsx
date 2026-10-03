import React from "react";

function StatCard({
  label,
  value,
  description,
  icon: Icon
}) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {Icon && <Icon size={20} strokeWidth={2} />}
      </div>

      <div className="stat-content">

        <span className="stat-label">
          {label}
        </span>

        <strong className="stat-value">
          {value}
        </strong>

        <span className="stat-description">
          {description}
        </span>

      </div>

    </div>
  );
}

export default StatCard;