// InventoryBarChart.jsx
import React from 'react';
import { Bar } from 'react-chartjs-2';

function InventoryBarChart({ data }) {
  const labels = data.map(item => item.itemName);
  const quantities = data.map(item => item.ordered);
  const prices = data.map(item => item.price);

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Quantity Ordered',
        data: quantities,
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      },
      {
        label: 'Price',
        data: prices,
        backgroundColor: 'rgba(255, 99, 132, 0.6)'
      }
    ]
  };

  return (
    <div className="inventory-bar-chart">
      <h3>Inventory Data</h3>
      <Bar data={chartData} />
    </div>
  );
}

export default InventoryBarChart;