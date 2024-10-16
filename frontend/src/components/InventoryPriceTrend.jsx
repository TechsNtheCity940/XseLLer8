import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';

const InventoryPriceTrend = () => {
  const [inventoryData, setInventoryData] = useState([]);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await fetch('http://localhost:5000/inventory');
        const data = await response.json();
        setInventoryData(data);
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      }
    }

    fetchInventory();
  }, []);

  // Prepare data for the line chart
  const chartData = {
    labels: inventoryData.map(item => item.itemName),
    datasets: [
      {
        label: 'Item Price',
        data: inventoryData.map(item => item.price),
        fill: false,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="inventory-price-trend">
      <h2>Inventory Price Trend</h2>
      <Line
        data={chartData}
        options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Price Trends Across Items',
            },
          },
        }}
      />
    </div>
  );
};

export default InventoryPriceTrend;
