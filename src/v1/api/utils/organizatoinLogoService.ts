import { StaticImagesService } from "./staticImagesService";

class OrganizationLogoService extends StaticImagesService {
  constructor() {
    super({
      savePath: "organizations/logo",
    });
  }
}

export { OrganizationLogoService };
