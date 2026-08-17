import { handleNodeRequest } from "../ordering/server.mjs";

export default async function handler(request, response) {
  return handleNodeRequest(request, response);
}
