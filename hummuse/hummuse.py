# Created on 27-Jan-2015-Tuesday
# Wireframe created
import webapp2
import os
import jinja2
from google.appengine.ext import db

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
		
		
class Projects(db.Model):
	projectName = db.StringProperty(required = True)
	projectNotes = db.TextProperty()
	projectCreated = db.DateTimeProperty(auto_now_add = True)

class AddProjectHandler(Handler):

	def get(self):
		p_cursor = db.GqlQuery("SELECT * FROM Projects")
		p = list(p_cursor)
		self.render("add_project.html", pList = p)
	
	def post(self):
		pName = self.request.get('ptitle')
		pNotes = self.request.get('pnotes')
		if (pName and pNotes):
			pro = Projects(projectName=pName,projectNotes=pNotes)
			pro.put()
			self.redirect('/')
		else:
			self.render("add_project.html", pName=pName, pNotes=pNotes, message="The fields can't be empty")
	
app = webapp2.WSGIApplication([
    ('/', AddProjectHandler)
], debug=True)
