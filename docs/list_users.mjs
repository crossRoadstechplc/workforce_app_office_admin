import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const users = await p.user.findMany({
  take: 40,
  select: {
    email: true,
    status: true,
    mustChangePassword: true,
    roles: { include: { role: true } },
    employee: {
      select: {
        employeeCode: true,
        organization: { select: { slug: true, name: true } },
      },
    },
    orgAdmin: {
      select: { organization: { select: { slug: true, name: true } } },
    },
    officeAdmins: {
      select: {
        office: { select: { name: true, organization: { select: { slug: true } } } },
      },
    },
  },
});
console.log(
  JSON.stringify(
    users.map((u) => ({
      email: u.email,
      status: u.status,
      mustChangePassword: u.mustChangePassword,
      roles: u.roles.map((r) => r.role.name),
      employee: u.employee,
      orgAdmin: u.orgAdmin,
      officeAdmins: u.officeAdmins,
    })),
    null,
    2
  )
);
await p.$disconnect();
