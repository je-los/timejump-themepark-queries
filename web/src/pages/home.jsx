import React from 'react';

export default function Home(){
  return (
    <div className="page">
      <div className="page-box">
        <h2 className="text-xl font-semibold mb-3">Welcome to Time Jump Theme Park</h2>
        <p className="text-sm text-gray-700 mb-4">
          Travel through eras—Jurassic, Medieval, Buccaneers, and Futuristic—without leaving the park.
          Use the top navigation to browse tickets, attractions, souvenirs, and food.
        </p>

        <div className="grid md:grid-cols-4 gap-4">
          <Card title="Tickets" desc="Buy day passes and add parking."/>
          <Card title="Attractions" desc="Explore rides by theme."/>
          <Card title="Gift Shop" desc="Pick souvenirs and merch."/>
          <Card title="Food Vendors" desc="Order snacks and meals."/>
        </div>
      </div>
    </div>
  );
}

function Card({ title, desc }){
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-sm text-gray-600">{desc}</div>
    </div>
  );
}
