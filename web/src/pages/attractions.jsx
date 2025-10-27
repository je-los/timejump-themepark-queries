import React from 'react';

const THEMES = [
  { key:'jurassic', title:'Jurassic', desc:'Dinosaurs and primeval thrills.' },
  { key:'medieval', title:'Medieval', desc:'Castles, knights, and quests.' },
  { key:'buccaneers', title:'Buccaneers', desc:'Pirates, ships, and treasure hunts.' },
  { key:'futuristic', title:'Futuristic', desc:'Sci-fi tech and space rides.' },
];

export default function Attractions(){
  return (
    <div className="page">
      <div className="page-box page-box--wide">
        <h2 className="text-xl font-semibold mb-4">Attractions by Theme</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {THEMES.map(t => (
            <div key={t.key} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold">{t.title}</div>
              <div className="text-sm text-gray-600">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
