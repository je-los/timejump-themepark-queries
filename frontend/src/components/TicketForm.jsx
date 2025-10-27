import { useState } from 'react'
import api from '../api/api.js'

export default function TicketForm() {
  const [form, setForm] = useState({ TicketType: 'General', Quantity: 1, PurchaseDate: '', ExpirationDate: '' })
  const [status, setStatus] = useState(null)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setStatus('Submitting…')
    try {
      const res = await api.post('/tickets', form)
      setStatus(`Success! Ticket ID: ${res.data.TicketID}`)
    } catch (e) {
      setStatus('Error: could not purchase ticket.')
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <h3>Purchase Tickets</h3>
      <div>
        <label>Ticket Type</label>
        <select name="TicketType" value={form.TicketType} onChange={onChange}>
          <option>General</option>
          <option>VIP</option>
          <option>Weekend</option>
        </select>
      </div>
      <div>
        <label>Quantity</label>
        <input type="number" name="Quantity" min="1" value={form.Quantity} onChange={onChange} />
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
        <div>
          <label>Purchase Date</label>
          <input type="date" name="PurchaseDate" value={form.PurchaseDate} onChange={onChange} />
        </div>
        <div>
          <label>Expiration Date</label>
          <input type="date" name="ExpirationDate" value={form.ExpirationDate} onChange={onChange} />
        </div>
      </div>
      <button className="btn" type="submit">Buy</button>
      {status && <p className="muted">{status}</p>}
    </form>
  )
}
