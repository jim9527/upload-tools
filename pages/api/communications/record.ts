import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'

const S3 = new AWS.S3()
const S3_BUCKET = process.env.S3_BUCKET || 'test-bucket'
const FILENAME = process.env.filename || 'test-json-data.json'
/** Use this flag to avoid overwriting file content while concurrent */
let PENDING_UPLOAD = false

const getContentFromS3 = async ({
  bucket = S3_BUCKET,
  filename = FILENAME,
}: {
  bucket?: string
  filename?: string
} = {}): Promise<Object | null> => {
  try {
    const data = await S3.getObject({ Bucket: bucket, Key: filename }).promise()

    return JSON.parse(data.Body.toString('utf-8'))
  } catch (error) {
    console.log('error ===>', error)
    return []
  }
}

const formatData = async (content: Object) => {
  /** generate file by date */
  const filename = `${new Date().toISOString().split('T')[0]}_${FILENAME}`
  while (PENDING_UPLOAD) {
    await new Promise((r) => setTimeout(r, 1000))
  }

  PENDING_UPLOAD = true
  const originalData = (await getContentFromS3({ filename })) as Array<Object>
  console.log('[Format Debug::] ======>', content)
  return {
    filename: filename,
    data: [...originalData, content],
  }
}

const uploadFileToS3 = async ({
  data,
  filename = FILENAME,
  s3Bucket = S3_BUCKET,
  contentType = 'application/json',
}: {
  data: Object
  filename?: string
  s3Bucket?: string
  contentType?: string
}) => {
  try {
    // setup params for putObject
    const params = {
      Bucket: s3Bucket,
      Key: filename,
      Body: JSON.stringify(data),
      ContentType: contentType,
    }
    await S3.putObject(params).promise()
    console.log(
      `File uploaded successfully at https://` +
        s3Bucket +
        `.s3.amazonaws.com/` +
        filename,
    )
  } catch (error) {
    console.log('error')
    throw error
  } finally {
    PENDING_UPLOAD = false
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
    return
  }

  const content = req.body

  try {
    await formatData(content).then(uploadFileToS3)
    return res.status(200).json({ message: 'Files uploaded successfully.' })
  } catch (error) {
    return res
      .status(500)
      .json({ error: 'An error occurred while uploading files.' })
  }
}

export default handler
