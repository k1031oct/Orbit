'use server';

import { revalidatePath } from 'next/cache';
import { addProject, deleteProject, updateProject } from '@/lib/db';

export async function createProject(formData: FormData) {
  const name = formData.get('name') as string;
  const gasUrl = (formData.get('gasUrl') as string) || undefined;
  const androidPath = formData.get('androidPath') as string;

  if (name && androidPath) {
    await addProject({ name, gasUrl, androidPath });
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

  await updateProject(id, { name, gasUrl, androidPath, description });
  revalidatePath('/');
  revalidatePath(`/projects/${id}`);
}
