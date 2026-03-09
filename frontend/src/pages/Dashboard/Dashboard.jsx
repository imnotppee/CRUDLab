import React, { useEffect, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import Page from '../../containers/Page/Page'
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  Chip,
} from '@mui/material'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const Dashboard = () => {
  const intl = useIntl()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState('') // ⭐ dropdown เลือก device
  const [tagComparison, setTagComparison] = useState([]) // ⭐ เก็บข้อมูลเปรียบเทียบ tag values
  const [liveSeriesByDevice, setLiveSeriesByDevice] = useState({}) // ⭐ จุด realtime จากการ refresh ทุก 5 วินาที
  const [lastRefresh, setLastRefresh] = useState(new Date()) // ⭐ Track last refresh time
  const [autoRefresh, setAutoRefresh] = useState(true) // ⭐ Enable/disable auto-refresh
  const [refreshing, setRefreshing] = useState(false) // ⭐ Show refreshing indicator
  
  // ⭐ Date/Time filtering
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7) // Default: 7 days ago
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]) // Default: today
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')

  function getAuth() {
    let auth = null
    const item = localStorage.getItem('base-shell:auth')
    if (item) auth = JSON.parse(item)
    return auth
  }

  async function loadDevices() {
    const auth = getAuth()
    if (!auth || !auth.token) {
      setLoading(false)
      return
    }

    try {
      setRefreshing(true)
      const token = auth.token.includes('Bearer') ? auth.token : `Bearer ${auth.token}`
      const resp = await fetch('/api/preferences/readDocument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: token },
        body: JSON.stringify({ collection: 'Device', query: {} }),
      })

      const json = await resp.json()
      setDevices(Array.isArray(json) ? json : [])
      setLastRefresh(new Date())
    } catch (error) {
      setDevices([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDevices()
    
    // ⭐ Auto-refresh ทุก 5 วินาที สำหรับแสดงข้อมูลแบบเรียลไทม์
    const intervalId = setInterval(() => {
      if (autoRefresh) {
        loadDevices()
      }
    }, 5000) // รีเฟรชทุก 5 วินาที
    
    return () => clearInterval(intervalId)
  }, [autoRefresh])

  // ⭐ เลือก device แรกตอนโหลดหรือเมื่อมีการเปลี่ยน
  useEffect(() => {
    if (devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]._id)
    }
  }, [devices, selectedDevice])

  useEffect(() => {
    const device = devices.find((d) => d._id === selectedDevice)
    if (!device || !Array.isArray(device.tags)) return

    const now = new Date()
    const timestamp = now.getTime()
    const livePoint = {
      timestamp,
      minute: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }

    device.tags.forEach((tag) => {
      livePoint[tag.name] = Number(tag.value) || 0
    })

    setLiveSeriesByDevice((prev) => {
      const existing = prev[selectedDevice] || []
      const last = existing[existing.length - 1]
      if (last && Math.abs(last.timestamp - timestamp) < 1500) {
        return prev
      }

      const merged = [...existing, livePoint].slice(-180)
      return {
        ...prev,
        [selectedDevice]: merged,
      }
    })
  }, [devices, selectedDevice, lastRefresh])

  // ⭐ สร้างข้อมูลเปรียบเทียบ tag values จาก history (รวมต่อนาที) + กรองตามวันและเวลา
  useEffect(() => {
    const device = devices.find((d) => d._id === selectedDevice)
    if (!device || !Array.isArray(device.tags)) {
      setTagComparison([])
      return
    }

    // สร้าง date/time range สำหรับการกรอง
    const startDateTime = new Date(`${startDate}T${startTime}:00`)
    const endDateTime = new Date(`${endDate}T${endTime}:00`)

    // สร้างข้อมูลจาก history + realtime points
    const seriesData = {}

    device.tags.forEach((tag) => {
      if (tag.history && Array.isArray(tag.history)) {
        tag.history.forEach((point) => {
          if (point.timestamp) {
            const time = new Date(point.timestamp)
            
            // ⭐ กรองตามวันและเวลา
            if (time >= startDateTime && time <= endDateTime) {
              const pointKey = new Date(
                time.getFullYear(),
                time.getMonth(),
                time.getDate(),
                time.getHours(),
                time.getMinutes(),
                time.getSeconds(),
              ).getTime()

              if (!seriesData[pointKey]) {
                // ⭐ แสดงเวลาเต็ม (วัน เวลา:วินาที)
                const displayTime = new Date(pointKey)
                const dateStr = displayTime.toLocaleDateString()
                const timeStr = displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                seriesData[pointKey] = { minute: `${dateStr} ${timeStr}`, timestamp: pointKey }
              }
              
              seriesData[pointKey][tag.name] = Number(point.value) || 0
            }
          }
        })
      }
    })

    const liveSeries = liveSeriesByDevice[selectedDevice] || []
    liveSeries.forEach((point) => {
      const time = new Date(point.timestamp)
      if (time >= startDateTime && time <= endDateTime) {
        if (!seriesData[point.timestamp]) {
          seriesData[point.timestamp] = {
            minute: point.minute,
            timestamp: point.timestamp,
          }
        }

        device.tags.forEach((tag) => {
          const value = point[tag.name]
          if (value !== undefined) {
            seriesData[point.timestamp][tag.name] = Number(value) || 0
          }
        })
      }
    })

    // ถ้าไม่มี history ให้ใช้ current value เก็บเป็น 1 record
    if (Object.keys(seriesData).length === 0) {
      const now = new Date()
      
      // ถ้าวันที่ปัจจุบันตรงกับช่วงที่เลือก ให้แสดง
      if (now >= startDateTime && now <= endDateTime) {
        const pointKey = now.getTime()
        const displayTime = new Date(pointKey)
        const dateStr = displayTime.toLocaleDateString()
        const timeStr = displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        seriesData[pointKey] = { minute: `${dateStr} ${timeStr}`, timestamp: pointKey }
        
        device.tags.forEach((tag) => {
          seriesData[pointKey][tag.name] = Number(tag.value) || 0
        })
      }
    }

    // เรียงลำดับตามเวลา
    const sortedData = Object.values(seriesData).sort((a, b) => {
      return a.timestamp - b.timestamp
    })

    setTagComparison(sortedData.slice(-240))
  }, [selectedDevice, devices, startDate, endDate, startTime, endTime, liveSeriesByDevice])

  const chartData = useMemo(() => {
    return devices.map((device, index) => ({
      index,
      label: device.deviceName || device._id || `Device ${index + 1}`,
      tagCount: Array.isArray(device.tags) ? device.tags.length : 0,
    }))
  }, [devices])

  // ⭐ คำนวณ Min/Max/Avg สำหรับแต่ละ tag จากข้อมูลที่แสดงบนกราฟ
  const tagStats = useMemo(() => {
    const stats = {}
    const device = devices.find((d) => d._id === selectedDevice)
    
    if (device && Array.isArray(device.tags)) {
      device.tags.forEach((tag) => {
        const values = tagComparison
          .map((point) => point[tag.name])
          .filter((value) => value !== undefined && value !== null)
          .map((value) => Number(value) || 0)

        if (values.length === 0) {
          values.push(Number(tag.value) || 0)
        }
        
        if (values.length > 0) {
          stats[tag.name] = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
            latest: values[values.length - 1],
          }
        }
      })
    }
    
    return stats
  }, [selectedDevice, devices, tagComparison])

  const totalDevices = chartData.length
  const totalTags = chartData.reduce((sum, item) => sum + item.tagCount, 0)
  const maxTagCount = Math.max(1, ...chartData.map((item) => item.tagCount))

  return (
    <Page pageTitle={intl.formatMessage({ id: 'dashboard', defaultMessage: 'Dashboard' })}>
      <Box sx={{ p: 3 }}>
        {/* Device Selector & Date/Time Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Select Device</InputLabel>
              <Select
                value={selectedDevice}
                label="Select Device"
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                {devices.map((device) => (
                  <MenuItem key={device._id} value={device._id}>
                    {device.deviceName || device._id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* ⭐ Auto-refresh indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {refreshing && (
                <CircularProgress size={16} sx={{ mr: 1 }} />
              )}
              <Chip 
                size="small" 
                label={`Last: ${lastRefresh.toLocaleTimeString()}`}
                color={autoRefresh ? 'success' : 'default'}
                variant="outlined"
              />
              <Button 
                size="small" 
                variant={autoRefresh ? 'contained' : 'outlined'} 
                color={autoRefresh ? 'success' : 'primary'}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? '🟢 Auto (5s)' : '⚫ Paused'}
              </Button>
              <Button size="small" variant="outlined" onClick={() => loadDevices()}>
                🔄 Refresh
              </Button>
            </Box>
          </Box>

          {/* Date/Time Filter Controls */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <Typography>→</Typography>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <Button
              variant="outlined"
              onClick={() => {
                const d = new Date()
                d.setDate(d.getDate() - 7)
                setStartDate(d.toISOString().split('T')[0])
                setEndDate(new Date().toISOString().split('T')[0])
                setStartTime('00:00')
                setEndTime('23:59')
              }}
            >
              Last 7 Days
            </Button>
          </Box>
        </Paper>

        {/* Main Layout: Stats Left + Chart Right */}
        <Grid container spacing={3}>
          {/* Left: Statistics */}
          <Grid item xs={12} md={3}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, transition: 'opacity 0.3s ease-in-out', opacity: refreshing ? 0.7 : 1 }}>
                {devices.find((d) => d._id === selectedDevice)?.tags?.map((tag) => {
                  const stat = tagStats[tag.name] || {}
                  return (
                    <Paper key={tag.name} sx={{ p: 2, textAlign: 'center', transition: 'all 0.3s ease-in-out' }}>
                      <Typography variant="caption" color="text.secondary">
                        {tag.name}
                      </Typography>
                      <Typography variant="h5" sx={{ my: 1, fontWeight: 'bold', color: autoRefresh ? 'success.main' : 'text.primary' }}>
                        {stat.latest !== undefined ? stat.latest : tag.value}
                      </Typography>
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        <div>Min: {stat.min !== undefined ? stat.min : '—'}</div>
                        <div>Max: {stat.max !== undefined ? stat.max : '—'}</div>
                        <div>Avg: {stat.avg !== undefined ? stat.avg : '—'}</div>
                      </Box>
                    </Paper>
                  )
                })}
              </Box>
            )}
          </Grid>

          {/* Right: Line Chart */}
          <Grid item xs={12} md={9}>
            <Paper sx={{ p: 2, height: '100%', position: 'relative' }}>
              {/* ⭐ Refreshing overlay */}
              {refreshing && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 10, 
                  right: 10, 
                  zIndex: 10,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  boxShadow: 1
                }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption">Updating...</Typography>
                </Box>
              )}
              
              <Typography variant="h6" sx={{ mb: 2 }}>
                Tag Values Over Time (Real-time)
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : tagComparison.length === 0 ? (
                <Typography color="text.secondary">No data for selected device</Typography>
              ) : (
                <Box sx={{ transition: 'opacity 0.3s ease-in-out', opacity: refreshing ? 0.7 : 1 }}>
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={tagComparison} margin={{ top: 5, right: 30, left: 0, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="minute" 
                        angle={-45} 
                        height={100}
                        tick={{ fontSize: 12 }}
                        interval={Math.max(0, Math.floor(tagComparison.length / 10))}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => Number(value).toFixed(2)}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                      />
                      <Legend />
                      {/* ⭐ ทุก tag แสดงเป็นเส้นกราฟ */}
                      {devices.find((d) => d._id === selectedDevice)?.tags?.map((tag, idx) => {
                        const colors = ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#9c27b0', '#ff9800']
                        return (
                          <Line
                            key={tag.name}
                            type="monotone"
                            dataKey={tag.name}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-in-out"
                          />
                        )
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Page>
  )
}

export default Dashboard
