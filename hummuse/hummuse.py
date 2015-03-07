# Created on 27-Jan-2015-Tuesday
# Wireframe created
import webapp2
import os
import jinja2
from google.appengine.ext import ndb

template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir), 
								autoescape = True)
class Handler(webapp2.RequestHandler):
	def write(self, *a, **kw):
		self.response.out.write(*a, **kw)
	
	def render_str(self, template, **params):
		return (jinja_env.get_template(template)).render(params)
		
	def render(self, template, **html_add_ins):
		self.write(self.render_str(template, **html_add_ins))

#class MyWorkHandler(Handler)
#	def get(self):
		
		
class Projects(ndb.Model):
	projectName = ndb.StringProperty(required = True)
	projectNotes = ndb.TextProperty()
	projectCreated = ndb.DateTimeProperty(auto_now_add = True)
	projectActive = ndb.BooleanProperty(default = True)

class AddProjectHandler(Handler):
	def get(self):
		p_cursor = ndb.gql("SELECT * FROM Projects")
		all_projects = list(p_cursor)
		active_projects = [p for p in all_projects if p.projectActive is not False]
		self.render("add_project.html", pList = active_projects)
	
	def post(self):
		pName = self.request.get('ptitle')
		pNotes = self.request.get('pnotes')
		if (pName):
			pro = Projects(projectName=pName, projectNotes=pNotes)
			pro.put()
			self.redirect('/')
		else:
			self.render("add_project.html", pName=pName, pNotes=pNotes, message="The fields can't be empty")


class DeleteProjectHandler(Handler):
	def post(self):
		project_id = self.request.get('key_id')
		project_key = ndb.Key( 'Projects', int(project_id) )
		p = project_key.get()
		if (p):
			p.projectActive = False
			p.put()
			self.response.out.write("Project \""+ p.projectName +"\" deleted successfully! ")
		else: self.response.out.write("Couldn't delete")
		self.redirect('/')


app = webapp2.WSGIApplication([
    ('/', AddProjectHandler),
    ('/delproject', DeleteProjectHandler)
], debug=True)
