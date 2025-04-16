// pages/api/apps.ts
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// 类型定义
type AppType = "dify";

interface AppItem {
  appId: string;
  type: string;
  appName: string;
  appKey: string;
}

// 文件存储路径
const DATA_PATH = path.join(process.cwd(), "/app/config/apps.json");

// 辅助函数：读取数据文件
const readData = async (): Promise<AppItem[]> => {
  try {
    const data = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error: any) {
    // 如果文件不存在则创建空数组
    if (error.code === "ENOENT") {
      await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
      await fs.writeFile(DATA_PATH, "[]");
      return [];
    }
    throw error;
  }
};

// 辅助函数：写入数据文件
const writeData = async (data: AppItem[]) => {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
};

// 生成唯一ID
const generateId = () => Date.now().toString();

async function handler(req: NextRequest, res: NextResponse) {
  try {
    const { method } = req;
    switch (req.method) {
      case "GET":
        return handleGet(req, res);
      case "POST":
        return handlePost(req, res);
      case "DELETE":
        return handleDelete(req, res);
      default:
        return handleGet(req, res);
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;

export async function getAllApps() {
  const apps = await readData();
  return apps;
}

// GET 处理
async function handleGet(req: NextRequest, res: NextResponse) {
  const apps = await readData();
  return NextResponse.json({ status: "success", data: apps });
}

// POST 处理
async function handlePost(req: NextRequest, res: NextResponse) {
  const formData = await req.formData();
  const appId = formData.get("appId") as string;
  const type = formData.get("type") as string;
  const appName = formData.get("appName") as string;
  const appKey = formData.get("appKey") as string;
  if (!type || !appName) {
    return NextResponse.json({
      status: "error",
      message: "Missing required fields",
    });
  }

  const apps = await readData();
  let newApp: AppItem = {
    appId,
    type,
    appName,
    appKey,
  };
  if (!appId) {
    newApp.appId = generateId();
    apps.push(newApp);
    await writeData(apps);
  } else {
    const index = apps.findIndex((a) => a.appId === appId);
    if (index === -1) {
      return NextResponse.json({
        status: "error",
        message: "App not found",
      });
    }
    newApp.appId = appId;
    apps[index] = newApp;
    await writeData(apps);
  }

  return NextResponse.json({ status: "success", data: newApp });
}

// DELETE 处理
async function handleDelete(req: NextRequest, res: NextResponse) {
  const formData = await req.formData();
  const appId = formData.get("appId");

  if (!appId) {
    return NextResponse.json({
      status: "error",
      message: "Missing app ID",
    });
  }

  const apps = await readData();
  const initialLength = apps.length;
  const filteredApps = apps.filter((a) => a.appId !== appId);

  if (filteredApps.length === initialLength) {
    return NextResponse.json({
      status: "error",
      message: "App not found",
    });
  }

  await writeData(filteredApps);
  return NextResponse.json({
    status: "success",
    message: "App deleted successfully",
  });
}
