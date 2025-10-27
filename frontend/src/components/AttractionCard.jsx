export default function AttractionCard({ a }) {
  return (
    <div className="card">
      <h3>{a.Name}</h3>
      <p className="muted">Type #{a.AttractionType} • Theme #{a.ThemeID}</p>
      <p>Duration: {a.Duration} • Height ≥ {a.HeightRestriction} in</p>
      <p>Vehicle: {a.RidersPerVehicle} riders, {a.RidersPerRow} per row</p>
      <p className="muted">By {a.Manufacturer}</p>
      {a.Cancelled ? <p>⚠️ Cancelled</p> : null}
    </div>
  )
}
