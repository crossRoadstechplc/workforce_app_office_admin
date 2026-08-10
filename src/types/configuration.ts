export type Office={id:string;name:string;address?:string|null;latitude?:number;longitude?:number;allowedRadiusMeters:number;maximumAccuracyMeters:number;timezone:string;isActive:boolean;createdAt?:string;updatedAt?:string};
export type ScheduleDay={weekday:number;checkInTime:string;checkOutTime:string};
export type Schedule={id:string;name:string;checkInTime:string;checkOutTime:string;lateGraceMinutes:number;workingDays:number[];days?:ScheduleDay[];timezone?:string;isActive:boolean;createdAt?:string;updatedAt?:string};
export type Paged<T>={items:T[];page:number;pageSize:number;total:number;totalPages?:number};
