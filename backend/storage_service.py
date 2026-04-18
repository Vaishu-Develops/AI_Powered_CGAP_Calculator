import os
import requests
import base64
from dotenv import load_dotenv

load_dotenv()

class ImageKitService:
    def __init__(self):
        self.public_key = os.getenv("IMAGEKIT_PUBLIC_KEY")
        self.private_key = os.getenv("IMAGEKIT_PRIVATE_KEY")
        self.folder = "/marksheets"
        self.upload_endpoint = "https://upload.imagekit.io/api/v1/files/upload"

    def upload_image(self, file_content: bytes, file_name: str):
        """
        Uploads an image to ImageKit via raw REST API to avoid SDK class parsing errors.
        Returns the file URL and file ID.
        """
        try:
            # Using HTTP Basic Auth with Private Key as username (password empty)
            auth = (self.private_key, "")
            
            # Send file as multipart form-data
            files = {
                'file': (file_name, file_content, 'application/octet-stream')
            }
            data = {
                'fileName': file_name,
                'folder': self.folder,
                'useUniqueFileName': 'true'
            }
            
            response = requests.post(self.upload_endpoint, auth=auth, files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                file_url = result.get("url")
                file_id = result.get("fileId")
                print(f"ImageKit Upload Success: {file_url} (ID: {file_id})")
                return file_url, file_id
            else:
                print(f"ImageKit Upload Failed: {response.status_code} - {response.text}")
                return None, None
                
        except Exception as e:
            print(f"ImageKit REST Upload Exception: {e}")
            return None, None

    def delete_image(self, file_id: str):
        """
        Deletes an image from ImageKit via REST API.
        """
        if not file_id: return False
        try:
            delete_endpoint = f"https://api.imagekit.io/v1/files/{file_id}"
            auth = (self.private_key, "")
            response = requests.delete(delete_endpoint, auth=auth)
            
            # 204 No Content is success
            if response.status_code == 204:
                return True
            else:
                print(f"ImageKit Delete Failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"ImageKit REST Delete Exception: {e}")
            return False

    def list_files(self, limit: int = 1000, skip: int = 0):
        """
        Lists files in the ImageKit folder, sorted by creation date (oldest first).
        """
        try:
            list_endpoint = "https://api.imagekit.io/v1/files"
            auth = (self.private_key, "")
            params = {
                "path": self.folder,
                "limit": limit,
                "skip": skip,
                "sort": "asc_created" # Oldest first
            }
            response = requests.get(list_endpoint, auth=auth, params=params)
            if response.status_code == 200:
                files = response.json()
                print(f"ImageKit List Success: Found {len(files)} files in {self.folder}")
                return files
            else:
                print(f"ImageKit List Failed: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            print(f"ImageKit REST List Exception: {e}")
            return []

    def cleanup_old_images(self, threshold: int = 500):
        """
        Checks total file count and purges oldest images if count > threshold.
        """
        try:
            # First, get a list of files. Limit to a reasonable number to check count.
            files = self.list_files(limit=1000)
            if not files:
                return

            current_count = len(files)
            if current_count > threshold:
                num_to_delete = current_count - threshold
                print(f"Cleanup: Current ImageKit count ({current_count}) exceeds threshold ({threshold}). Purging {num_to_delete} oldest files...")
                
                # Take the first N files (oldest because of asc_created sort)
                to_delete = files[:num_to_delete]
                for f in to_delete:
                    fid = f.get("fileId")
                    if fid:
                        self.delete_image(fid)
                
                print(f"Cleanup: Successfully purged {num_to_delete} files.")
            else:
                # Optional: log check
                # print(f"Cleanup Check: {current_count}/{threshold} used.")
                pass

        except Exception as e:
            print(f"ImageKit Cleanup Exception: {e}")

# Singleton instance
storage_service = ImageKitService()
