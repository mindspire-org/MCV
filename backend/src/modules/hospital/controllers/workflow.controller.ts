import { Request, Response } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { HospitalWorkflowItem } from "../models/WorkflowItem";
import { HospitalWorkflowTask } from "../models/WorkflowTask";
import { HospitalAuditLog } from "../models/AuditLog";

// Validation schemas
const createWorkflowItemSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  data: z.any().optional(),
});

const updateWorkflowItemSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z
    .enum([
      "draft",
      "submitted",
      "in_review",
      "approved",
      "rejected",
      "in_progress",
      "closed",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  data: z.any().optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedTo: z.string().min(1),
  dueDate: z.string().datetime(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  completionNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
});

const addCommentSchema = z.object({
  text: z.string().min(1),
  internal: z.boolean().default(false),
});

// Helper to log audit
async function logAudit(
  actor: string,
  action: string,
  detail?: string,
  path?: string,
) {
  try {
    await HospitalAuditLog.create({ actor, action, detail, path });
  } catch (e) {
    console.error("Failed to log audit:", e);
  }
}

// Workflow Item CRUD
export const listWorkflowItems = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "20",
      type,
      status,
      priority,
      assignedTo,
      submittedBy,
      tags,
      search,
      from,
      to,
    } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (submittedBy) filter.submittedBy = submittedBy;
    if (tags) filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from as string);
      if (to) filter.createdAt.$lte = new Date(to as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const items = await HospitalWorkflowItem.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("assignedTo", "username")
      .populate("submittedBy", "username")
      .lean();

    const total = await HospitalWorkflowItem.countDocuments(filter);

    res.json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list workflow items" });
  }
};

export const createWorkflowItem = async (req: Request, res: Response) => {
  try {
    const parsed = createWorkflowItemSchema.parse(req.body);
    const user = (req as any).user?.username || "unknown";

    const item = await HospitalWorkflowItem.create({
      ...parsed,
      submittedBy: user,
      createdBy: user,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
    });

    await logAudit(
      user,
      "CREATE_WORKFLOW_ITEM",
      `Created ${item.type}: ${item.title}`,
      "/hospital/workflow",
    );
    res.status(201).json(item);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ errors: e.errors });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to create workflow item" });
  }
};

export const getWorkflowItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await HospitalWorkflowItem.findById(id)
      .populate("assignedTo", "username")
      .populate("submittedBy", "username")
      .populate("createdBy", "username")
      .lean();

    if (!item)
      return res.status(404).json({ error: "Workflow item not found" });

    // Also fetch related tasks
    const tasks = await HospitalWorkflowTask.find({ workflowItemId: id })
      .populate("assignedTo", "username")
      .populate("assignedBy", "username")
      .sort({ dueDate: 1 })
      .lean();

    res.json({ ...item, tasks });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get workflow item" });
  }
};

export const updateWorkflowItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateWorkflowItemSchema.parse(req.body);
    const user = (req as any).user?.username || "unknown";

    const updateData: any = { ...parsed, updatedBy: user };
    if (parsed.dueDate) updateData.dueDate = new Date(parsed.dueDate);

    const item = await HospitalWorkflowItem.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("assignedTo", "username")
      .populate("submittedBy", "username")
      .lean();

    if (!item)
      return res.status(404).json({ error: "Workflow item not found" });

    await logAudit(
      user,
      "UPDATE_WORKFLOW_ITEM",
      `Updated ${item.type}: ${item.title}`,
      "/hospital/workflow",
    );
    res.json(item);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ errors: e.errors });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to update workflow item" });
  }
};

export const deleteWorkflowItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user?.username || "unknown";

    const item = await HospitalWorkflowItem.findByIdAndDelete(id);
    if (!item)
      return res.status(404).json({ error: "Workflow item not found" });

    // Also delete related tasks
    await HospitalWorkflowTask.deleteMany({ workflowItemId: id });

    await logAudit(
      user,
      "DELETE_WORKFLOW_ITEM",
      `Deleted ${item.type}: ${item.title}`,
      "/hospital/workflow",
    );
    res.json({ message: "Workflow item deleted" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete workflow item" });
  }
};

// Comments
export const addComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = addCommentSchema.parse(req.body);
    const user = (req as any).user?.username || "unknown";

    const item = await HospitalWorkflowItem.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: {
            author: user,
            text: parsed.text,
            internal: parsed.internal,
            createdAt: new Date(),
          },
        },
        updatedBy: user,
      },
      { new: true },
    ).lean();

    if (!item)
      return res.status(404).json({ error: "Workflow item not found" });

    await logAudit(
      user,
      "ADD_COMMENT",
      `Added comment to ${item.type}: ${item.title}`,
      "/hospital/workflow",
    );
    res.json(item);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ errors: e.errors });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to add comment" });
  }
};

// Tasks
export const createTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = createTaskSchema.parse(req.body);
    const user = (req as any).user?.username || "unknown";

    const task = await HospitalWorkflowTask.create({
      ...parsed,
      workflowItemId: id,
      assignedBy: user,
      createdBy: user,
      dueDate: new Date(parsed.dueDate),
    });

    await logAudit(
      user,
      "CREATE_TASK",
      `Created task for workflow item ${id}: ${task.title}`,
      "/hospital/workflow",
    );
    res.status(201).json(task);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ errors: e.errors });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const parsed = updateTaskSchema.parse(req.body);
    const user = (req as any).user?.username || "unknown";

    const updateData: any = { ...parsed, updatedBy: user };
    if (parsed.dueDate) updateData.dueDate = new Date(parsed.dueDate);
    if (parsed.status === "completed") updateData.completedAt = new Date();

    const task = await HospitalWorkflowTask.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true },
    )
      .populate("assignedTo", "username")
      .populate("assignedBy", "username")
      .lean();

    if (!task) return res.status(404).json({ error: "Task not found" });

    await logAudit(
      user,
      "UPDATE_TASK",
      `Updated task ${task.title}`,
      "/hospital/workflow",
    );
    res.json(task);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ errors: e.errors });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to update task" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const user = (req as any).user?.username || "unknown";

    const task = await HospitalWorkflowTask.findByIdAndDelete(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    await logAudit(
      user,
      "DELETE_TASK",
      `Deleted task ${task.title}`,
      "/hospital/workflow",
    );
    res.json({ message: "Task deleted" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

// Dashboard summary
export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const [
      total,
      draft,
      submitted,
      inReview,
      approved,
      rejected,
      inProgress,
      closed,
      overdueTasks,
    ] = await Promise.all([
      HospitalWorkflowItem.countDocuments(),
      HospitalWorkflowItem.countDocuments({ status: "draft" }),
      HospitalWorkflowItem.countDocuments({ status: "submitted" }),
      HospitalWorkflowItem.countDocuments({ status: "in_review" }),
      HospitalWorkflowItem.countDocuments({ status: "approved" }),
      HospitalWorkflowItem.countDocuments({ status: "rejected" }),
      HospitalWorkflowItem.countDocuments({ status: "in_progress" }),
      HospitalWorkflowItem.countDocuments({ status: "closed" }),
      HospitalWorkflowTask.countDocuments({
        status: { $in: ["pending", "in_progress"] },
        dueDate: { $lt: new Date() },
      }),
    ]);

    res.json({
      total,
      draft,
      submitted,
      inReview,
      approved,
      rejected,
      inProgress,
      closed,
      overdueTasks,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
};

// CQI Stats (Complaints/Incidents/CAPA)
export const getCqiStats = async (_req: Request, res: Response) => {
  try {
    const types = ["complaint", "incident", "capa"];

    const countsByTypeStatus = await HospitalWorkflowItem.aggregate([
      { $match: { type: { $in: types } } },
      {
        $group: {
          _id: { type: "$type", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const byType: Record<string, Record<string, number>> = {};
    for (const row of countsByTypeStatus) {
      const t = row._id?.type;
      const s = row._id?.status;
      if (!t || !s) continue;
      byType[t] = byType[t] || {};
      byType[t][s] = row.count;
    }

    const overdueTasksAll = await HospitalWorkflowTask.countDocuments({
      status: { $in: ["pending", "in_progress"] },
      dueDate: { $lt: new Date() },
    });

    const capaItems = await HospitalWorkflowItem.find(
      { type: "capa" },
      { _id: 1 },
    ).lean();
    const capaIds = capaItems.map((x: any) => x._id);
    const overdueTasksCapa = capaIds.length
      ? await HospitalWorkflowTask.countDocuments({
          workflowItemId: { $in: capaIds },
          status: { $in: ["pending", "in_progress"] },
          dueDate: { $lt: new Date() },
        })
      : 0;

    res.json({
      byType,
      overdueTasksAll,
      overdueTasksCapa,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get CQI stats" });
  }
};

export const getOperationsStats = async (_req: Request, res: Response) => {
  try {
    const types = ["housekeeping", "utility", "security"];

    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Week's date range (last 7 days)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Overall counts by type and status
    const countsByTypeStatus = await HospitalWorkflowItem.aggregate([
      { $match: { type: { $in: types } } },
      {
        $group: {
          _id: { type: "$type", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Today's counts
    const todayCounts = await HospitalWorkflowItem.aggregate([
      {
        $match: {
          type: { $in: types },
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    // Week's counts
    const weekCounts = await HospitalWorkflowItem.aggregate([
      {
        $match: {
          type: { $in: types },
          createdAt: { $gte: weekAgo },
        },
      },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const byType: Record<string, Record<string, number>> = {};
    for (const row of countsByTypeStatus) {
      const t = row._id?.type;
      const s = row._id?.status;
      if (!t || !s) continue;
      byType[t] = byType[t] || {};
      byType[t][s] = row.count;
    }

    const todayByType: Record<string, number> = {};
    for (const row of todayCounts) {
      todayByType[row._id] = row.count;
    }

    const weekByType: Record<string, number> = {};
    for (const row of weekCounts) {
      weekByType[row._id] = row.count;
    }

    // Overdue tasks for operations
    const operationItems = await HospitalWorkflowItem.find(
      { type: { $in: types } },
      { _id: 1 },
    ).lean();
    const operationIds = operationItems.map((x: any) => x._id);

    const overdueTasksAll = operationIds.length
      ? await HospitalWorkflowTask.countDocuments({
          workflowItemId: { $in: operationIds },
          status: { $in: ["pending", "in_progress"] },
          dueDate: { $lt: new Date() },
        })
      : 0;

    res.json({
      byType,
      todayByType,
      weekByType,
      overdueTasksAll,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get Operations stats" });
  }
};

// File upload configuration
const uploadsDir = path.join(process.cwd(), "uploads", "workflow");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Upload attachment to workflow item
export const uploadWorkflowItemAttachment = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const uploadedBy = (req as any).user?.id || "anonymous";

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workflowItem = await HospitalWorkflowItem.findById(id);
    if (!workflowItem) {
      // Clean up uploaded file if workflow item not found
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: "Workflow item not found" });
    }

    const attachment = {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy,
      uploadedAt: new Date(),
      url: `/uploads/workflow/${file.filename}`,
    };

    workflowItem.attachments = workflowItem.attachments || [];
    workflowItem.attachments.push(attachment);
    await workflowItem.save();

    res.json(attachment);
  } catch (e) {
    console.error(e);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload attachment" });
  }
};

// Upload attachment to workflow task
export const uploadWorkflowTaskAttachment = async (
  req: Request,
  res: Response,
) => {
  try {
    const { taskId } = req.params;
    const file = req.file;
    const uploadedBy = (req as any).user?.id || "anonymous";

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const task = await HospitalWorkflowTask.findById(taskId);
    if (!task) {
      // Clean up uploaded file if task not found
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: "Workflow task not found" });
    }

    const attachment = {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy,
      uploadedAt: new Date(),
      url: `/uploads/workflow/${file.filename}`,
    };

    task.attachments = task.attachments || [];
    task.attachments.push(attachment);
    await task.save();

    res.json(attachment);
  } catch (e) {
    console.error(e);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload attachment" });
  }
};

// Delete attachment from workflow item
export const deleteWorkflowItemAttachment = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id, attachmentId } = req.params;

    const workflowItem = await HospitalWorkflowItem.findById(id);
    if (!workflowItem) {
      return res.status(404).json({ error: "Workflow item not found" });
    }

    const attachment = workflowItem.attachments?.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Delete file from filesystem
    const filePath = path.join(uploadsDir, attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove attachment from database
    workflowItem.attachments = workflowItem.attachments?.filter(
      (att: any) => att._id.toString() !== attachmentId,
    );
    await workflowItem.save();

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
};

// Delete attachment from workflow task
export const deleteWorkflowTaskAttachment = async (
  req: Request,
  res: Response,
) => {
  try {
    const { taskId, attachmentId } = req.params;

    const task = await HospitalWorkflowTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Workflow task not found" });
    }

    const attachment = task.attachments?.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Delete file from filesystem
    const filePath = path.join(uploadsDir, attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove attachment from database
    task.attachments = task.attachments?.filter(
      (att: any) => att._id.toString() !== attachmentId,
    );
    await task.save();

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
};

// Export upload middleware for routes
export const uploadWorkflowItemFile = upload.single("file");
export const uploadWorkflowTaskFile = upload.single("file");
