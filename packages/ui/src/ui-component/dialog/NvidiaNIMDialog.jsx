import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import PropTypes from 'prop-types'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress,
    Stepper,
    Step,
    StepLabel
} from '@mui/material'

const NvidiaNIMDialog = ({ open, onClose, onComplete }) => {
    const portalElement = document.getElementById('portal')

    const [activeStep, setActiveStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [imageTag, setImageTag] = useState('')
    const [containerInfo, setContainerInfo] = useState(null)
    const [pollInterval, setPollInterval] = useState(null)

    const steps = ['Download Installer', 'Pull Image', 'Start Container']

    const handleDownloadInstaller = async () => {
        try {
            setLoading(true)
            await axios.get('/api/v1/nvidia-nim/download-installer')
            setLoading(false)
        } catch (err) {
            let errorData = err.message
            if (typeof err === 'string') {
                errorData = err
            } else if (err.response?.data) {
                errorData = err.response.data.message
            }
            alert('Failed to download installer: ' + errorData)
            setLoading(false)
        }
    }

    const handlePullImage = async () => {
        try {
            setLoading(true)
            // check if image already exists
            const imageResponse = await axios.post('/api/v1/nvidia-nim/get-image', { imageTag })
            console.log('imageResponse =', imageResponse.data)

            if (imageResponse.data && imageResponse.data.tag === imageTag) {
                setLoading(false)
                setActiveStep(2)
                return
            }

            // Get token first
            const tokenResponse = await axios.get('/api/v1/nvidia-nim/get-token')
            const apiKey = tokenResponse.data.access_token

            // Pull image
            await axios.post('/api/v1/nvidia-nim/pull-image', {
                imageTag,
                apiKey
            })

            // Start polling for image status
            const interval = setInterval(async () => {
                try {
                    const imageResponse = await axios.post('/api/v1/nvidia-nim/get-image', { imageTag })
                    if (imageResponse.data) {
                        clearInterval(interval)
                        setLoading(false)
                        setActiveStep(2)
                    }
                } catch (err) {
                    // Continue polling if image not found
                    if (err.response?.status !== 404) {
                        clearInterval(interval)
                        alert('Failed to check image status: ' + err.message)
                        setLoading(false)
                    }
                }
            }, 5000)

            setPollInterval(interval)
        } catch (err) {
            let errorData = err.message
            if (typeof err === 'string') {
                errorData = err
            } else if (err.response?.data) {
                errorData = err.response.data.message
            }
            alert('Failed to pull image: ' + errorData)
            setLoading(false)
        }
    }

    const handleStartContainer = async () => {
        try {
            setLoading(true)

            const containerResponse = await axios.post('/api/v1/nvidia-nim/get-container', { imageTag })
            console.log('containerResponse =', containerResponse.data)

            if (containerResponse.data && containerResponse.data && containerResponse.data.status === 'running') {
                setContainerInfo(containerResponse.data)
                setLoading(false)
                onComplete(containerResponse.data)
                onClose()
                return
            }

            const tokenResponse = await axios.get('/api/v1/nvidia-nim/get-token')
            const apiKey = tokenResponse.data.access_token

            await axios.post('/api/v1/nvidia-nim/start-container', {
                imageTag,
                apiKey
            })

            // Start polling for container status
            const interval = setInterval(async () => {
                try {
                    const containerResponse = await axios.post('/api/v1/nvidia-nim/get-container', { imageTag })
                    if (containerResponse.data) {
                        clearInterval(interval)
                        setContainerInfo(containerResponse.data)
                        setLoading(false)
                        onComplete(containerResponse.data)
                        onClose()
                    }
                } catch (err) {
                    // Continue polling if container not found
                    if (err.response?.status !== 404) {
                        clearInterval(interval)
                        alert('Failed to check container status: ' + err.message)
                        setLoading(false)
                    }
                }
            }, 5000)

            setPollInterval(interval)
        } catch (err) {
            let errorData = err.message
            if (typeof err === 'string') {
                errorData = err
            } else if (err.response?.data) {
                errorData = err.response.data.message
            }
            alert('Failed to start container: ' + errorData)
            setLoading(false)
        }
    }

    const handleSkip = () => {
        setActiveStep(1)
    }

    const handleNext = () => {
        if (activeStep === 1 && !imageTag) {
            alert('Please enter an image tag')
            return
        }

        switch (activeStep) {
            case 1:
                handlePullImage()
                break
            case 2:
                handleStartContainer()
                break
            default:
                setActiveStep((prev) => prev + 1)
        }
    }

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollInterval) {
                clearInterval(pollInterval)
            }
        }
    }, [pollInterval])

    // clear state on close
    useEffect(() => {
        if (!open) {
            setActiveStep(0)
            setLoading(false)
            setImageTag('')
            setContainerInfo(null)
        }
    }, [open])

    const component = open ? (
        <Dialog open={open} onClose={onClose} className='w-full max-w-md'>
            <DialogTitle>NIM Setup</DialogTitle>
            <DialogContent className='mt-4'>
                <Stepper activeStep={activeStep} className='mb-8'>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 0 && (
                    <div style={{ marginTop: 20 }}>
                        <p style={{ marginBottom: 20 }}>Would you like to download the NIM installer?</p>
                        {loading && <CircularProgress />}
                    </div>
                )}

                {activeStep === 1 && (
                    <div>
                        <TextField
                            label='Image Tag'
                            value={imageTag}
                            onChange={(e) => setImageTag(e.target.value)}
                            fullWidth
                            sx={{ mt: 2 }}
                            className='mb-4'
                        />
                        {loading && (
                            <div>
                                <div style={{ marginBottom: 20 }} />
                                <CircularProgress />
                                <p>Pulling image...</p>
                            </div>
                        )}
                    </div>
                )}

                {activeStep === 2 && (
                    <div>
                        {loading ? (
                            <>
                                <div style={{ marginBottom: 20 }} />
                                <CircularProgress />
                                <p>Starting container...</p>
                            </>
                        ) : (
                            <p>Image is ready! Click Next to start the container.</p>
                        )}
                    </div>
                )}
            </DialogContent>
            <DialogActions className='p-4'>
                <Button onClick={onClose} variant='outline'>
                    Cancel
                </Button>
                {activeStep === 0 && (
                    <Button onClick={handleSkip} variant='outline'>
                        Skip
                    </Button>
                )}
                <Button onClick={activeStep === 0 ? handleDownloadInstaller : handleNext} disabled={loading}>
                    {activeStep === 0 ? 'Download' : 'Next'}
                </Button>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

NvidiaNIMDialog.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    onComplete: PropTypes.func
}

export default NvidiaNIMDialog
