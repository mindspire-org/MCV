import { z } from 'zod'

export const createWorkflowItemSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  data: z.any().optional(),
})

export const updateWorkflowItemSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'in_review', 'approved', 'rejected', 'in_progress', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  data: z.any().optional(),
})

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  assignedTo: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().datetime('Invalid due date format'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']).optional(),
  dueDate: z.string().datetime('Invalid due date format').optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  completionNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
})

export const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required'),
  internal: z.boolean().default(false),
})
