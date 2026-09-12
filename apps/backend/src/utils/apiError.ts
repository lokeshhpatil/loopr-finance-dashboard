class ApiError extends Error{
  statusCode:number;
  // message: string;
  errors:any;
  success:boolean;
  data:any;
  
  constructor(
    statusCode:number,
    message:string ="",
    errors:any = [],
    success:boolean = false,
    data:any = null,

  ){
    super(message);

    this.statusCode = statusCode;
    this.errors = errors;
    this.data = data;
    this.success = success;
    this.message = message;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;