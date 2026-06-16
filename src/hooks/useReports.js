import { useState, useEffect, useCallback } from 'react'
import { fetchReports, createReport, updateReport, deleteReport } from '../lib/db'
import toast from 'react-hot-toast'

export function useReports() {
  const [reports, setReports]   = useState([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchReports()
      setReports(data)
    } catch (err) {
      toast.error('Failed to load reports')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = async (data) => {
    const id = toast.loading('Saving report…')
    try {
      await createReport(data)
      toast.success('Report created', { id })
      await load()
    } catch (err) {
      toast.error('Failed to create report', { id })
      console.error(err)
    }
  }

  const update = async (reportId, data) => {
    const id = toast.loading('Updating…')
    try {
      await updateReport(reportId, data)
      toast.success('Report updated', { id })
      await load()
    } catch (err) {
      toast.error('Failed to update report', { id })
      console.error(err)
    }
  }

  const remove = async (reportId) => {
    const id = toast.loading('Deleting…')
    try {
      await deleteReport(reportId)
      toast.success('Report deleted', { id })
      await load()
    } catch (err) {
      toast.error('Failed to delete report', { id })
      console.error(err)
    }
  }

  return { reports, loading, reload: load, add, update, remove }
}
