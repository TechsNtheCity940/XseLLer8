import React from 'react';

const Forecasting = ({ sales }) => {
  const totalSales = sales.reduce((acc, sale) => acc + sale.cost, 0);
  const months = [...new Set(sales.map((sale) => sale.month))];
  const avgSales = months.length > 0 ? (totalSales / months.length).toFixed(2) : 0;

  return (
    <div>
      <h2>Sales Forecasting</h2>
      <p>Total Sales: ${totalSales.toFixed(2)}</p>
      <p>Average Monthly Sales: ${avgSales}</p>
    </div>
  );
};

export default Forecasting;
