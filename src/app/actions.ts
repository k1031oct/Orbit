'use server';

import { revalidatePath } from 'next/cache';
import { addProject, deleteProject, updateProject, addLocalRequirement, removeLocalRequirement as dbRemoveLocalRequirement, changeLocalRequirementStatus as dbChangeLocalRequirementStatus } from '@/lib/db';

export async function createProject(formData: FormData) {
  const name = formData.get('name') as string;
  const gasUrl = (formData.get('gasUrl') as string) || undefined;
  const androidPath = formData.get('androidPath') as string;
  const isRemoteSyncEnabled = formData.get('isRemoteSyncEnabled') === 'on' ? 1 : 0;

  if (name && androidPath) {
    await addProject({ name, gasUrl, androidPath, isRemoteSyncEnabled });
    revalidatePath('/');
  }
}

export async function removeProject(id: string) {
  await deleteProject(id);
  revalidatePath('/');
}

export async function editProject(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const gasUrl = (formData.get('gasUrl') as string) || undefined;
  const androidPath = formData.get('androidPath') as string;
  const description = (formData.get('description') as string) || undefined;
  const latestVersion = (formData.get('latestVersion') as string) || undefined;
  const isRemoteSyncEnabled = formData.get('isRemoteSyncEnabled') === 'on' ? 1 : 0;

  await updateProject(id, { name, gasUrl, androidPath, description, latestVersion, isRemoteSyncEnabled });
  revalidatePath('/');
  revalidatePath(`/projects/${id}`);
}

export async function createLocalRequirement(projectId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const description = (formData.get('description') as string) || undefined;
  const target = (formData.get('target') as string) || undefined;

  if (title) {
    await addLocalRequirement({ projectId, title, description, target });
    revalidatePath(`/projects/${projectId}`);
  }
}

export async function removeLocalRequirement(projectId: string, id: number) {
  await dbRemoveLocalRequirement(id);
  revalidatePath(`/projects/${projectId}`);
}

export async function changeLocalRequirementStatus(projectId: string, id: number, status: string) {
  await dbChangeLocalRequirementStatus(id, status);
  revalidatePath(`/projects/${projectId}`);
}
