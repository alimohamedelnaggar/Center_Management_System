import { request } from '@playwright/test';
import { accountFor, apiBase } from './env.js';

// A small API session used only for preparation and cleanup around a recording
// (never on camera). It signs in through the same product endpoint as the UI.
// Absolute paths are used on purpose: a leading slash on a baseURL that already
// contains /api/V1 would be resolved from the origin and hit a 404.
const authPath = '/api/V1/Authentication/SignIn';
const studentPath = '/api/V1/Student/Paginated';

export async function apiLogin(role) {
  const account = accountFor(role);
  const context = await request.newContext({
    baseURL: apiBase,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  });

  const response = await context.post(authPath, {
    data: { phoneNumber: account.phone, password: account.password },
  });

  if (!response.ok()) {
    throw new Error(
      `API sign-in for ${role} failed: ${response.status()} ${await response.text()}`,
    );
  }

  const body = await response.json();
  if (!body?.accessToken) {
    throw new Error(`API sign-in for ${role} returned no accessToken.`);
  }

  const authorized = await request.newContext({
    baseURL: apiBase,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${body.accessToken}`,
    },
  });
  await context.dispose();

  return {
    request: authorized,
    token: body.accessToken,
    role,
    async dispose() {
      await authorized.dispose();
    },
  };
}

export async function findStudentsByPhone(api, phone) {
  const response = await api.request.get(studentPath, {
    params: { pageIndex: 1, pageSize: 50, search: phone },
  });
  if (!response.ok()) {
    throw new Error(`Student search failed: ${response.status()} ${await response.text()}`);
  }
  const body = await response.json();
  return (body?.data?.items ?? []).filter((item) => item.phone === phone);
}

export async function findStudentsByName(api, name) {
  const response = await api.request.get(studentPath, {
    params: { pageIndex: 1, pageSize: 50, search: name },
  });
  if (!response.ok()) {
    throw new Error(`Student search failed: ${response.status()} ${await response.text()}`);
  }
  const body = await response.json();
  return (body?.data?.items ?? []).filter((item) => item.fullName === name);
}

export async function deleteStudentsByName(api, name) {
  const students = await findStudentsByName(api, name);
  for (const student of students) {
    const response = await api.request.delete(`/api/V1/Student/delete/${student.id}`);
    if (!response.ok()) {
      throw new Error(
        `Deleting student ${student.id} failed: ${response.status()} ${await response.text()}`,
      );
    }
  }
  return students.length;
}

export async function deleteStudentsByPhone(api, phone) {
  const students = await findStudentsByPhone(api, phone);
  for (const student of students) {
    const response = await api.request.delete(`/api/V1/Student/delete/${student.id}`);
    if (!response.ok()) {
      throw new Error(
        `Deleting student ${student.id} failed: ${response.status()} ${await response.text()}`,
      );
    }
  }
  return students.length;
}

export async function getGroups(api) {
  const response = await api.request.get('/api/V1/Group/get-all');
  if (!response.ok()) {
    throw new Error(`Group list failed: ${response.status()} ${await response.text()}`);
  }
  const body = await response.json();
  return body?.data ?? [];
}
