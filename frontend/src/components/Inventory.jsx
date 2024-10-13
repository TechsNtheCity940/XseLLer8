import React, { useState, useEffect } from 'react';

const Inventory = () => {
  const [inventoryData, setInventoryData] = useState([]);

  useEffect(() => {
    // Fetch inventory data from backend
    async function fetchInventory() {
      try {
        const response = await fetch('http://localhost:5000/inventory');  // Example endpoint
        const data = await response.json();
        setInventoryData(data);
      } catch (error) {
        console.error("Error fetching inventory data:", error);
      }
    }
    fetchInventory();
  }, []);

  return (
    <div className="inventory">
      <h2>Inventory</h2>
      {inventoryData.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Item#</th>
              <th>Item Name</th>
              <th>Brand</th>
              <th>Pack Size</th>
              <th>Price</th>
              <th>Ordered</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {inventoryData.map((item, index) => (
              <tr key={index}>
                <td>{item.itemNumber}</td>
                <td>{item.itemName}</td>
                <td>{item.brand}</td>
                <td>{item.packSize}</td>
                <td>{item.price}</td>
                <td>{item.ordered}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No inventory data available.</p>
      )}
    </div>
  );
};

export default Inventory;
