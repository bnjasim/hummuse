# Created on 27-Jan-2015-Tuesday
# Wireframe created
import webapp2
import os
import logging
import jinja2
from google.appengine.ext import ndb
from google.appengine.api import users

template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir), 
								autoescape = True)
# username is not Id because users might change their user name or email
class Account(ndb.Model):
	nickname = ndb.StringProperty()
	email = ndb.StringProperty()

	@ndb.transactional
	def my_get_or_insert(cls, id, **kwds):
		key = ndb.Key(cls, id)
		ent = key.get()
		if ent is not None:
			return (ent, False)  # False meaning "not created"
		ent = cls(**kwds)
		ent.key = key
		ent.put()
		return (ent, True)  # True meaning "created"
		
class Projects(ndb.Model):
	projectName = ndb.StringProperty(required = True)
	projectNotes = ndb.TextProperty()
	projectCreated = ndb.DateTimeProperty(auto_now_add = True)
	projectActive = ndb.BooleanProperty(default = True)


class Handler(webapp2.RequestHandler):
	def write(self, *a, **kw):
		self.response.out.write(*a, **kw)
	
	def render_str(self, template, **params):
		return (jinja_env.get_template(template)).render(params)
		
	def render(self, template, **html_add_ins):
		self.write(self.render_str(template, **html_add_ins))

	def check_user_login(self):
		user = users.get_current_user()
		message = "No message"
		if user is None: 
			self.response.write("Redirecting to the login page......")
			self.redirect(users.create_login_url(self.request.uri))
			user = users.get_current_user()
			logging.error("User is "+ str(user))	
			user_id = user.user_id()
			user_in_db, status = Account.my_get_or_insert(user_id, nickname = user.nickname(), email = user.email())
   			message = "entity created"
		logout_url = users.create_logout_url('/')
		return (user, logout_url,message) 


class AddProjectHandler(Handler):
	def get(self):
		user, logout,message = self.check_user_login() # make the user login
		user_name = user.nickname()

		p_cursor = ndb.gql("SELECT * FROM Projects")
		all_projects = list(p_cursor)
		active_projects = [p for p in all_projects if p.projectActive is not False]
		self.render("add_project.html", pList = active_projects, user_name = user_name, logout_url = logout,message=message)
	
	def post(self):
		user, logout = self.check_user_login() # make sure user login
		user_name = user.nickname()
		user_ent_key = ndb.Key(Account, user.user_id())
		self.response.write(user_ent_key)

		pName = self.request.get('ptitle')
		pNotes = self.request.get('pnotes')
		if (pName):
			pro = Projects(parent = user_ent_key, projectName=pName, projectNotes=pNotes)
			pro.put()
			self.redirect('/')
		else:
			self.render("add_project.html", pName=pName, pNotes=pNotes, message="The fields can't be empty")


class DeleteProjectHandler(Handler):
	def post(self):
		user, logout = self.check_user_login() # make sure user login
		user_name = user.nick_name()
		user_ent_key = ndb.Key(Account, user.user_id())

		project_id = self.request.get('key_id')
		project_key = ndb.Key( 'Projects', int(project_id), parent = user_ent_key )
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
