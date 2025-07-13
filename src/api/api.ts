import * as photoshop from "./photoshop"; 
import * as illustrator from "./illustrator"; 
import { uxp } from "../globals";

const hostName =
  uxp?.host?.name.toLowerCase().replace(/\s/g, "") || ("" as string);

// prettier-ignore
let host = {} as 
  & typeof photoshop 
  & typeof illustrator; 

if (hostName.startsWith("photoshop")) host = photoshop; 
if (hostName.startsWith("illustrator")) host = illustrator; 

export const api = host;
