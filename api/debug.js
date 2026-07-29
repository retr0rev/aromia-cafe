module.exports = async function handler(req, res) {
  const u = (req.url || '').split('?')[0]
  
  if (u === '/api/debug') {
    return res.json({
      DATABASE_URL: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      url: req.url,
    })
  }
  
  return res.status(404).json({ error: 'Not found' })
}