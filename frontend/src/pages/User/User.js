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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material'

const UserPage = () => {
  const intl = useIntl()
  const collection = 'User'

  const [users, setUsers] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentUser, setCurrentUser] = useState({
    _id: '',
    userName: '',
    fullName: '',
    userLevel: 'user',
    userState: 'enable',
    email: '',
    password: '',
    dateCreate: '',
    dateExpire: '',
  })

  function getAuth() {
    let auth = null
    const item = localStorage.getItem('base-shell:auth')
    if (item) {
      auth = JSON.parse(item)
    }
    return auth
  }

  async function loadUsers(query = {}) {
    const auth = getAuth()
    try {
      const resp = await fetch('/api/preferences/readDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: auth.token,
        },
        body: JSON.stringify({
          collection: collection,
          query: query,
        }),
      })
      const json = await resp.json()
      setUsers(json)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleCreate() {
    const auth = getAuth()
    try {
      // Check for duplicate _id
      const existing = users.find((u) => u._id === currentUser._id)
      if (existing) {
        alert('_id already exists.')
        return
      }

      const resp = await fetch('/api/preferences/createDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: auth.token,
        },
        body: JSON.stringify({
          collection: collection,
          data: { ...currentUser, dateCreate: new Date().toString() },
        }),
      })
      const json = await resp.json()
      console.log(json)
      alert('User created successfully.')
      setOpenDialog(false)
      loadUsers()
      resetForm()
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Error creating user.')
    }
  }

  async function handleUpdate() {
    const auth = getAuth()
    try {
      const dataToUpdate = { ...currentUser }
      if (!dataToUpdate.password) {
        delete dataToUpdate.password
      }

      const resp = await fetch('/api/preferences/updateDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: auth.token,
        },
        body: JSON.stringify({
          collection: collection,
          data: dataToUpdate,
        }),
      })
      const json = await resp.json()
      console.log(json)
      alert('User updated successfully.')
      setOpenDialog(false)
      loadUsers()
      resetForm()
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error updating user.')
    }
  }

  async function handleDelete(userId) {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return
    }

    const auth = getAuth()
    try {
      const resp = await fetch('/api/preferences/deleteDocument', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: auth.token,
        },
        body: JSON.stringify({
          collection: collection,
          query: { _id: userId },
        }),
      })
      const json = await resp.json()
      console.log(json)
      alert('User deleted successfully.')
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user.')
    }
  }

  function openCreateDialog() {
    setEditMode(false)
    resetForm()
    setOpenDialog(true)
  }

  function openEditDialog(user) {
    setEditMode(true)
    setCurrentUser({ ...user, password: '' })
    setOpenDialog(true)
  }

  function resetForm() {
    setCurrentUser({
      _id: '',
      userName: '',
      fullName: '',
      userLevel: 'user',
      userState: 'enable',
      email: '',
      password: '',
      dateCreate: '',
      dateExpire: '',
    })
  }

  function handleSave() {
    if (editMode) {
      handleUpdate()
    } else {
      handleCreate()
    }
  }

  return (
    <Page pageTitle={intl.formatMessage({ id: 'user', defaultMessage: 'User' })}>
      <Box sx={{ p: 3 }}>
        {/* Create Section */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
          >
            Create
          </Button>
        </Box>

        {/* Users Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>State</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>{user._id}</TableCell>
                    <TableCell>{user.userName}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.userLevel}</TableCell>
                    <TableCell>{user.userState}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => openEditDialog(user)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDelete(user._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create/Edit Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editMode ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="User ID"
                    fullWidth
                    value={currentUser._id}
                    onChange={(e) =>
                      setCurrentUser({ ...currentUser, _id: e.target.value })
                    }
                    disabled={editMode}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Username"
                    fullWidth
                    value={currentUser.userName}
                    onChange={(e) =>
                      setCurrentUser({ ...currentUser, userName: e.target.value })
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    value={currentUser.fullName}
                    onChange={(e) =>
                      setCurrentUser({ ...currentUser, fullName: e.target.value })
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={currentUser.email}
                    onChange={(e) =>
                      setCurrentUser({ ...currentUser, email: e.target.value })
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    value={currentUser.password}
                    onChange={(e) =>
                      setCurrentUser({ ...currentUser, password: e.target.value })
                    }
                    required={!editMode}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>User Level</InputLabel>
                    <Select
                      value={currentUser.userLevel}
                      label="User Level"
                      onChange={(e) =>
                        setCurrentUser({ ...currentUser, userLevel: e.target.value })
                      }
                    >
                      <MenuItem value="user">User</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>User State</InputLabel>
                    <Select
                      value={currentUser.userState}
                      label="User State"
                      onChange={(e) =>
                        setCurrentUser({ ...currentUser, userState: e.target.value })
                      }
                    >
                      <MenuItem value="enable">Enable</MenuItem>
                      <MenuItem value="disable">Disable</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" color="primary">
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Page>
  )
}

export default UserPage
