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
} from '@mui/material'

import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material'

const Device = () => {
  const intl = useIntl()
  const collection = 'Device'

  const [devices, setDevices] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [editMode, setEditMode] = useState(false)

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
  })

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

    try {
      const resp = await fetch('/api/preferences/readDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: auth?.token,
        },
        body: JSON.stringify({
          collection: collection,
          query: query,
        }),
      })

      const json = await resp.json()
      setDevices(Array.isArray(json) ? json : [])
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

    setTagInputs({ name: '', value: '' })
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
    setCurrentDevice({ ...device })
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
          authorization: auth.token,
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
          authorization: auth?.token,
        },
        body: JSON.stringify({
          collection: collection,
          data: {
            ...currentDevice,
            dateUpdate: new Date().toISOString(),
          },
        }),
      })

      await resp.json()
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

    try {
      await fetch('/api/preferences/deleteDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: auth?.token,
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
  function handleSave() {
    if (editMode) handleUpdate()
    else handleCreate()
  }

  // ✅ TAG FUNCTIONS
  function addTag() {
    if (!tagInputs.name.trim()) return alert('Tag name required')

    const newTag = {
      name: tagInputs.name,
      value: tagInputs.value,
      record: false,
      sync: false,
      api: false,
    }

    setCurrentDevice({
      ...currentDevice,
      tags: [...currentDevice.tags, newTag],
    })

    setTagInputs({ name: '', value: '' })
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
              <Typography variant="h6">Tags</Typography>

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <TextField
                  label="Tag Name"
                  value={tagInputs.name}
                  onChange={(e) =>
                    setTagInputs({ ...tagInputs, name: e.target.value })
                  }
                />

                <TextField
                  label="Value"
                  value={tagInputs.value}
                  onChange={(e) =>
                    setTagInputs({ ...tagInputs, value: e.target.value })
                  }
                />

                <Button onClick={addTag} variant="contained">
                  Add
                </Button>
              </Box>

              {/* TAG TABLE */}
              <Table sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Value</TableCell>
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
            <Button variant="contained" onClick={handleSave}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Page>
  )
}

export default Device
