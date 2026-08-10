export type Office = { id:string; name:string; address?:string|null; isActive:boolean };
export type ScheduleDay = { weekday:number; checkInTime:string; checkOutTime:string };
export type Schedule = { id:string; name:string; checkInTime:string; checkOutTime:string; lateGraceMinutes:number; workingDays:number[]; days?:ScheduleDay[]; isActive:boolean };
export type Employee = { id:string; userId:string; employeeCode:string; firstName:string; middleName?:string|null; lastName:string; phone?:string|null; jobTitle?:string|null; department?:string|null; employmentStartDate:string; status:"ACTIVE"|"INACTIVE"|"TERMINATED"; officeId?:string|null; scheduleId?:string|null; createdAt?:string; updatedAt?:string; user:{ id:string; email:string; status:string; mustChangePassword:boolean; lastLoginAt?:string|null }; office?:Office|null; schedule?:Schedule|null };
export type PageMeta = { page:number; pageSize:number; total:number; totalPages:number };
export type EmployeeList = { items:Employee[]; meta:PageMeta };
