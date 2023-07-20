import axios from 'axios'
import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'

function ModalContent({ onClose, value, status = '1', info }) {
  return (
    <div className="testmodal">
      <div
        className="progress mx-3"
        role="progressbar"
        aria-label="Example with label"
        style={{ maxWidth: '500px', width: '100%' }}
      >
        <div className="progress-bar" style={{ width: `${value}%` }}>
          {`${value}%`}
        </div>
      </div>
      {status === '1' ? (
        <div className="mt-3">Image is uploading.</div>
      ) : (
        <div className="mt-3" style={{ color: 'var(--bs-danger)' }}>
          {info}
        </div>
      )}
      {status !== '1' && (
        <button className="btn btn-primary align-self-center" onClick={onClose}>
          Close
        </button>
      )}
    </div>
  )
}

const FileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const [showModal, setShowModal] = useState(false)
  const [percentCompleted, setPercentCompleted] = useState(0)
  const [processId, setProcessId] = useState(null)
  const [info, setInfo] = useState('')
  const [status, setStatus] = useState('1')

  const btnStyle = useMemo(() => {
    if (!isUploading) {
      return 'btn btn-primary align-self-center'
    } else {
      return 'btn btn-primary align-self-center disabled'
    }
  }, [isUploading])

  useEffect(() => {
    if (ref.current !== null) {
      ref.current.setAttribute('directory', '')
      ref.current.setAttribute('webkitdirectory', '')
    }
  }, [ref])

  const resetFileInput = () => {
    ref.current.value = ''
    setSelectedFiles([])
  }

  const handleClose = () => {
    setShowModal(false)
    setPercentCompleted(0)
    setProcessId(null)
    setInfo('')
  }

  const handleFileChange = (event) => {
    setStatus('1')
    const files = event.target.files
    if (files.length > 0) {
      setSelectedFiles([...files])
    }
  }

  const handleUpload = async () => {
    try {
      const pId = `ut-${+new Date()}`
      setIsUploading(true)
      setProcessId(pId)
      const formData = new FormData()
      formData.append('processId', pId)
      const pathmap = {}
      selectedFiles.forEach((file) => {
        console.log(file, '---->')
        if (file.webkitRelativePath) {
          pathmap[file.name] = file.webkitRelativePath
        }
      })

      formData.append('pathmap', JSON.stringify(pathmap))

      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })

      try {
        const config = {
          onUploadProgress: function (progressEvent) {
            var percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            )
            console.log(percentCompleted, '----->')
            setPercentCompleted(percentCompleted)
          },
        }

        setShowModal(true)
        const response = await axios
          .post('/api/upload', formData, config)
          .then(({ data }) => {
            setInfo(
              `${data.uploadedCount} images have been updated successfully.`,
            )
          })
        setStatus('3')
        resetFileInput()
        console.log('Files uploaded successfully')
      } catch (error) {
        setStatus('2')
        console.error('Failed to upload files')
        setInfo(
          `All images have been uploaded to server successfully, but failed to upload files to S3`,
        )
      }
    } catch (error) {
      setStatus('2')
      console.error('An error occurred while uploading files:', error)
      setInfo('An error occurred while uploading files')
    } finally {
      setIsUploading(false)
    }
  }

  const renderItems = () => {
    const lis = selectedFiles.map((item) => {
      return <li>{item.webkitRelativePath}</li>
    })

    return lis.length ? (
      <>
        <h3>{status === '3' ? 'Previous upload files' : 'All files'}</h3>
        <ul>{lis}</ul>
      </>
    ) : null
  }

  return (
    <form className="d-flex flex-column m-auto">
      <div className="mb-3">
        <label htmlFor="formFileMultiple" className="form-label">
          Please select directory
        </label>
        <input
          className="form-control"
          id="formFileMultiple"
          type="file"
          disabled={isUploading}
          ref={ref}
          multiple={true}
          onChange={handleFileChange}
        />
      </div>
      {renderItems()}
      <button
        className={btnStyle}
        type="button"
        onClick={handleUpload}
        disabled={!selectedFiles.length}
      >
        Upload Files
      </button>
      {showModal &&
        createPortal(
          <ModalContent
            onClose={handleClose}
            value={percentCompleted}
            info={info}
            status={status}
          />,
          document.body,
        )}
    </form>
  )
}

export default FileUpload
