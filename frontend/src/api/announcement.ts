/**
 * 公告 API 服务
 */

import request from './request'

/**
 * 公告数据接口
 */
export interface Announcement {
  id: number
  title: string
  content?: string
  show?: boolean
}

/**
 * API 响应接口
 */
interface ApiResponse {
  code: number
  msg: string
  info?: {
    notice: Announcement[]
  }
  error?: string
}

/**
 * 获取公告列表
 * @returns 公告列表
 */
export const getAnnouncements = (): Promise<ApiResponse> => {
  return request.get<ApiResponse>('/api/announcements')
}

/**
 * 获取公告详情
 * @param id - 公告ID
 * @returns 公告详情
 */
export const getAnnouncementDetail = (id: number): Promise<ApiResponse> => {
  return request.get<ApiResponse>(`/api/announcements/${id}`)
}

/**
 * 创建公告（管理后台用）
 * @param data - 公告数据
 * @returns 创建结果
 */
export const createAnnouncement = (data: {
  title: string
  content?: string
  status?: 'active' | 'inactive'
  sort_order?: number
}): Promise<ApiResponse> => {
  return request.post<ApiResponse>('/api/announcements', data)
}

/**
 * 更新公告（管理后台用）
 * @param id - 公告ID
 * @param data - 更新数据
 * @returns 更新结果
 */
export const updateAnnouncement = (
  id: number,
  data: {
    title?: string
    content?: string
    status?: 'active' | 'inactive'
    sort_order?: number
  }
): Promise<ApiResponse> => {
  return request.put<ApiResponse>(`/api/announcements/${id}`, data)
}

/**
 * 删除公告（管理后台用）
 * @param id - 公告ID
 * @returns 删除结果
 */
export const deleteAnnouncement = (id: number): Promise<ApiResponse> => {
  return request.delete<ApiResponse>(`/api/announcements/${id}`)
}

export default {
  getAnnouncements,
  getAnnouncementDetail,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
}

