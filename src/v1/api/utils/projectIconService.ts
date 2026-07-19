import { StaticImagesService } from "./staticImagesService";

class ProjectIconService extends StaticImagesService {
  constructor() {
    super({
      savePath: "projects/icon",
    });
  }
}

export { ProjectIconService };
