"""ComfyUI-denjiro-Nodes

A collection of custom nodes for ComfyUI.

Frontend-only nodes (such as Reroute Box) live in web/js.
Python nodes are registered in NODE_CLASS_MAPPINGS below.
"""

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# ComfyUI serves every .js file in this folder to the browser.
WEB_DIRECTORY = "./web/js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
