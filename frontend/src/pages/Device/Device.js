import React, { useState, useEffect } from 'react'
import Page from '../../containers/Page/Page'
import { useIntl } from 'react-intl'

import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  Checkbox,
  Chip,
  Select,
  MenuItem,
} from '@mui/material'

import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material'

const PREDEFINED_TAGS = [
  {
    name: 'tag1',
    script: 'return Math.floor(Math.random() * 101);',
  },
  {
    name: 'tag2',
    script: 'return Math.floor(Math.random() * 11) + 50;',
  },
]

const Device = () => {
  const intl = useIntl()
  const collection = 'Device'

  const [devices, setDevices] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [currentDevice, setCurrentDevice] = useState({
    _id: '',
    deviceName: '',
    siteId: '',
    model: '',
    apiCode: '',
    lineId: '',
    note: '',
    tags: [],
  })

  const [tagInputs, setTagInputs] = useState({
    name: '',
    value: '',
    script: '',
    interval: 'none',
  })

  const [scriptResults, setScriptResults] = useState({})

  function ensureTagsHaveInterval(device) {
    const validIntervals = ['none', '1m', '5m', '10m', '1h']
    return {
      ...device,
      tags: (device.tags || []).map((tag) => {
        const interval = validIntervals.includes(tag.interval) ? tag.interval : 'none'
        return {
          ...tag,
          interval,
          script: tag.script || '',
        }
      }),
    }
  }

  function toBearer(token) {
    if (!token) return ''
    return token.includes('Bearer ') ? token : `Bearer ${token}`
  }

  // ✅ AUTH TOKEN
  function getAuth() {
    let auth = null
    const item = localStorage.getItem('base-shell:auth')
    if (item) auth = JSON.parse(item)
    return auth
  }

  // ✅ LOAD DEVICES
  async function loadDevices(query = {}) {
    const auth = getAuth()
    if (!auth || !auth.token) {
      setDevices([])
      return
    }

    try {
      const resp = await fetch('/api/preferences/readDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: toBearer(auth.token),
        },
        body: JSON.stringify({
          collection: collection,
          query: query,
        }),
      })

      const json = await resp.json()
      setDevices((Array.isArray(json) ? json : []).map((device) => ensureTagsHaveInterval(device)))
    } catch (error) {
      console.error('Error loading devices:', error)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [])

  // ✅ RESET FORM
  function resetForm() {
    setCurrentDevice({
      _id: '',
      deviceName: '',
      siteId: '',
      model: '',
      apiCode: '',
      lineId: '',
      note: '',
      tags: [],
    })

    setTagInputs({ name: '', value: '', script: '', interval: 'none' })
    setScriptResults({})
  }

  // ✅ OPEN CREATE
  function openCreateDialog() {
    setEditMode(false)
    resetForm()
    setOpenDialog(true)
  }

  // ✅ OPEN EDIT
  function openEditDialog(device) {
    setEditMode(true)
    setCurrentDevice(ensureTagsHaveInterval(device))
    setScriptResults({})
    setOpenDialog(true)
  }

  // ✅ CREATE DEVICE
  async function handleCreate() {
    const auth = getAuth()
    if (!auth || !auth.token) {
      alert('Please sign in first.')
      return
    }

    try {
      const resp = await fetch('/api/preferences/createDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: toBearer(auth.token),
        },
        body: JSON.stringify({
          collection: collection,
          data: {
            ...currentDevice,
            dateCreate: new Date().toISOString(),
            dateUpdate: new Date().toISOString(),
          },
        }),
      })

      const json = await resp.json()
      if (!resp.ok) {
        console.error('API Error:', resp.status, json)
        alert(`Error: ${resp.status} ${resp.statusText}`)
        return
      }
      alert('Device created successfully!')
      setOpenDialog(false)
      loadDevices()
      resetForm()
    } catch (error) {
      console.error(error)
      alert('Error creating device: ' + error.message)
    }
  }

  // ✅ UPDATE DEVICE
  async function handleUpdate() {
    const auth = getAuth()

    try {
      const resp = await fetch('/api/preferences/updateDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: toBearer(auth?.token),
        },
        body: JSON.stringify({
          collection: collection,
          data: {
            ...currentDevice,
            dateUpdate: new Date().toISOString(),
          },
        }),
      })

      const json = await resp.json()
      if (!resp.ok) {
        alert(`Error: ${json?.message || resp.status}`)
        return
      }
      alert('Device updated successfully!')
      setOpenDialog(false)
      loadDevices()
    } catch (error) {
      console.error(error)
      alert('Error updating device.')
    }
  }

  // ✅ DELETE DEVICE
  async function handleDelete(deviceId) {
    if (!window.confirm('Delete this device?')) return

    const auth = getAuth()
    if (!auth || !auth.token) {
      alert('Please sign in first.')
      return
    }

    try {
      await fetch('/api/preferences/deleteDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: toBearer(auth.token),
        },
        body: JSON.stringify({
          collection: collection,
          query: { _id: deviceId },
        }),
      })

      alert('Device deleted!')
      loadDevices()
    } catch (error) {
      console.error(error)
      alert('Error deleting device.')
    }
  }

  // ✅ SAVE BUTTON
  async function handleSave() {
    if (isSaving) return
    setIsSaving(true)
    try {
      if (editMode) await handleUpdate()
      else await handleCreate()
    } finally {
      setIsSaving(false)
    }
  }

  // ✅ TAG FUNCTIONS
  function addTag() {
    if (!tagInputs.name.trim()) return alert('Tag name required')

    const newTag = {
      name: tagInputs.name,
      value: tagInputs.value,
      script: tagInputs.script,
      interval: tagInputs.interval,
      record: false,
      sync: false,
      api: false,
      lastScriptRun: null,
    }

    setCurrentDevice({
      ...currentDevice,
      tags: [...currentDevice.tags, newTag],
    })

    setTagInputs({ name: '', value: '', script: '', interval: 'none' })
  }

  function removeTag(index) {
    setCurrentDevice({
      ...currentDevice,
      tags: currentDevice.tags.filter((_, i) => i !== index),
    })
  }

  function updateTag(index, field, value) {
    const updated = [...currentDevice.tags]
    updated[index][field] = value
    setCurrentDevice({ ...currentDevice, tags: updated })
    if (field === 'script' || field === 'value') {
      setScriptResults((prev) => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    }
  }

  function runScript(index) {
    const tag = currentDevice.tags[index]
    const script = (tag.script || '').trim()

    if (!script) {
      setScriptResults((prev) => ({ ...prev, [index]: { status: 'warn', output: 'No script' } }))
      return
    }

    try {
      const fn = new Function('value', script)
      const result = fn(tag.value)
      setScriptResults((prev) => ({ ...prev, [index]: { status: 'ok', output: String(result) } }))
    } catch (error) {
      setScriptResults((prev) => ({ ...prev, [index]: { status: 'error', output: error.message } }))
    }
  }

  function runAllScripts() {
    currentDevice.tags.forEach((_, index) => runScript(index))
  }

  return (
    <Page pageTitle="Device">
      <Box sx={{ p: 3 }}>
        {/* HEADER */}
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Add Device
        </Button>

        {/* TABLE */}
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>API Code</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {devices.map((device) => (
                <TableRow key={device._id}>
                  <TableCell>{device._id}</TableCell>
                  <TableCell>{device.deviceName}</TableCell>
                  <TableCell>{device.model}</TableCell>
                  <TableCell>{device.apiCode}</TableCell>

                  <TableCell align="center">
                    <IconButton onClick={() => openEditDialog(device)}>
                      <EditIcon />
                    </IconButton>

                    <IconButton
                      color="error"
                      onClick={() => handleDelete(device._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* DIALOG */}
        <Dialog open={openDialog} fullWidth maxWidth="md">
          <DialogTitle>
            {editMode ? 'Edit Device' : 'Create Device'}
          </DialogTitle>

          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <TextField
                  label="Device ID"
                  fullWidth
                  value={currentDevice._id}
                  disabled={editMode}
                  onChange={(e) =>
                    setCurrentDevice({ ...currentDevice, _id: e.target.value })
                  }
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  label="Device Name"
                  fullWidth
                  value={currentDevice.deviceName}
                  onChange={(e) =>
                    setCurrentDevice({
                      ...currentDevice,
                      deviceName: e.target.value,
                    })
                  }
                />
              </Grid>
            </Grid>

            {/* TAG SECTION */}
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">Tags</Typography>
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  startIcon={<RunIcon />}
                  onClick={runAllScripts}
                  disabled={currentDevice.tags.length === 0}
                >
                  Run All
                </Button>
              </Box>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={2}>
                  <Select
                    fullWidth
                    displayEmpty
                    value={tagInputs.name}
                    onChange={(e) => {
                      const selected = PREDEFINED_TAGS.find((tag) => tag.name === e.target.value)
                      setTagInputs({
                        ...tagInputs,
                        name: e.target.value,
                        script: selected ? selected.script : '',
                      })
                    }}
                  >
                    <MenuItem value=""><em>Select Tag</em></MenuItem>
                    {PREDEFINED_TAGS.map((tag) => (
                      <MenuItem key={tag.name} value={tag.name}>{tag.name}</MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    label="Value"
                    fullWidth
                    value={tagInputs.value}
                    onChange={(e) => setTagInputs({ ...tagInputs, value: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Script"
                    fullWidth
                    multiline
                    minRows={3}
                    value={tagInputs.script}
                    onChange={(e) => setTagInputs({ ...tagInputs, script: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Select
                    fullWidth
                    value={tagInputs.interval}
                    onChange={(e) => setTagInputs({ ...tagInputs, interval: e.target.value })}
                  >
                    <MenuItem value="none">No Interval</MenuItem>
                    <MenuItem value="1m">1 Minute</MenuItem>
                    <MenuItem value="5m">5 Minutes</MenuItem>
                    <MenuItem value="10m">10 Minutes</MenuItem>
                    <MenuItem value="1h">1 Hour</MenuItem>
                  </Select>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button onClick={addTag} variant="contained" fullWidth sx={{ height: 56 }}>
                    Add
                  </Button>
                </Grid>
              </Grid>

              {/* TAG TABLE */}
              <Table sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Script</TableCell>
                    <TableCell>Interval</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Record</TableCell>
                    <TableCell>Sync</TableCell>
                    <TableCell>API</TableCell>
                    <TableCell>Remove</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {currentDevice.tags.map((tag, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{tag.name}</TableCell>
                      <TableCell>{tag.value}</TableCell>

                      <TableCell sx={{ minWidth: 260 }}>
                        <TextField
                          multiline
                          minRows={3}
                          fullWidth
                          value={tag.script || ''}
                          onChange={(e) => updateTag(idx, 'script', e.target.value)}
                        />
                      </TableCell>

                      <TableCell sx={{ minWidth: 120 }}>
                        <Select
                          fullWidth
                          size="small"
                          value={tag.interval || 'none'}
                          onChange={(e) => updateTag(idx, 'interval', e.target.value)}
                        >
                          <MenuItem value="none">None</MenuItem>
                          <MenuItem value="1m">1m</MenuItem>
                          <MenuItem value="5m">5m</MenuItem>
                          <MenuItem value="10m">10m</MenuItem>
                          <MenuItem value="1h">1h</MenuItem>
                        </Select>
                      </TableCell>

                      <TableCell sx={{ minWidth: 150 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<RunIcon />}
                            onClick={() => runScript(idx)}
                          >
                            Run
                          </Button>
                          {scriptResults[idx] && (
                            <Chip
                              label={scriptResults[idx].output}
                              color={
                                scriptResults[idx].status === 'ok'
                                  ? 'success'
                                  : scriptResults[idx].status === 'warn'
                                    ? 'warning'
                                    : 'error'
                              }
                              size="small"
                            />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Checkbox
                          checked={tag.record}
                          onChange={(e) =>
                            updateTag(idx, 'record', e.target.checked)
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Checkbox
                          checked={tag.sync}
                          onChange={(e) =>
                            updateTag(idx, 'sync', e.target.checked)
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Checkbox
                          checked={tag.api}
                          onChange={(e) =>
                            updateTag(idx, 'api', e.target.checked)
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <IconButton onClick={() => removeTag(idx)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Page>
  )
}

export default Device
