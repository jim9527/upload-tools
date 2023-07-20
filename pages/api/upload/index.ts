// pages/api/upload.ts

import { NextApiRequest, NextApiResponse } from 'next'
import multer from 'multer'
import aws from 'aws-sdk'
import multerS3 from 'multer-s3'

const recordMap = new Map()
const S3_BUCKET = process.env.S3_BUCKET || 'test-bucket' // Replace with your S3 bucket name

const s3 = new aws.S3()

const countingSize = (pId) => {
  const currentSize = recordMap.get(pId)
  const newSize = currentSize ? currentSize + 1 : 1

  recordMap.set(pId, newSize)
}

const upload = multer({
  storage: multerS3({
    s3,
    bucket: S3_BUCKET,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    contentDisposition: 'inline',
    key: (req, file, cb) => {
      let filePath = file.originalname

      const pathmap = JSON.parse(req.body.pathmap)
      // If the file is in a directory, include the directory path in the key
      if (pathmap[file.originalname]) {
        filePath = pathmap[file.originalname]
      }

      filePath = 'test-images/' + filePath

      console.log('-------->', file.originalname, '---->', filePath)
      cb(null, filePath)
      countingSize(req.body.processId)
    },
  }),
})

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    await upload.array('files')(req, res, (err: any) => {
      if (err) {
        console.error('Error uploading files:', err)
        return res
          .status(500)
          .json({ error: 'An error occurred while uploading files.' })
      }

      const uploadedCount = recordMap.get(req.body.processId) || 0
      return res.status(200).json({
        message: 'Files uploaded successfully.',
        uploadedCount: uploadedCount,
      })
    })
  } catch (error) {
    console.error('Error uploading files:', error, '!!!!!!!! ')
    return res
      .status(500)
      .json({ error: 'An error occurred while uploading files.' })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default handler
