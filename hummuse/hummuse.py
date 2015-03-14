# Created on 27-Jan-2015-Tuesday
# Wireframe created
import webapp2
import os
import jinja2
from google.appengine.ext import ndb
from google.appengine.api import users
import logging

template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir), 
								autoescape = True)
# username is not Id because users might change their user name or email
class Account(ndb.Model):
	nickname = ndb.StringProperty()
	email = ndb.StringProperty()
	userCreated = ndb.DateTimeProperty(auto_now_add = True)

	@classmethod
	@ndb.transactional
	def my_get_or_insert(cls, id, **kwds):
		key = ndb.Key(cls, id)
		ent = key.get()
		if ent is not None:
			return False  # False meaning "Already existing"
		ent = cls(**kwds)
		ent.key = key
		ent.put()
		return True  # True meaning "Newly created"
	
		
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


class AddProjectHandler(Handler):

	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
		else:
			logout = users.create_logout_url('/')
			user_ent_key = ndb.Key(Account, user.user_id())	

			fresh_user = self.request.get('fresh_user')
			message_new_user = ''
			if fresh_user == 'True':
				message_new_user = 'Thank you for Signing Up to Hummuse'

			p_cursor = ndb.gql("SELECT * FROM Projects WHERE ANCESTOR IS :1", user_ent_key)
			all_projects = list(p_cursor)
			active_projects = [p for p in all_projects if p.projectActive is not False]
			self.render("add_project.html", 
					     pList = active_projects, 
					     user_name = user.nickname(), 
					     logout_url = logout,
					     Congrats = message_new_user)
	
	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
		else:
			user = users.get_current_user()
			user_ent_key = ndb.Key(Account, user.user_id())	
			pName = self.request.get('ptitle')
			pNotes = self.request.get('pnotes')
			if (pName):
				pro = Projects(parent = user_ent_key, 
							   projectName=pName, 
							   projectNotes=pNotes)
				pro.put()
				self.redirect('/')
			else:
				self.render("add_project.html", 
						     pName=pName, 
							 pNotes=pNotes, 
		  				     warning="The fields can't be empty")


class DeleteProjectHandler(Handler):
	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
		else:
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


class RegisterUser(webapp2.RequestHandler):
	"Redirected to here from the login page. So always user is not None"

	def get(self):
		user = users.get_current_user()
		if user:
			user_id = user.user_id()
			nickname = user.nickname()
			email = user.email()
			status = Account.my_get_or_insert(user_id, 
											  nickname = nickname, 
											  email = email)
			self.redirect('/?fresh_user=' + str(status))			
		
		else:
			self.response.write('Access Denied')



app = webapp2.WSGIApplication([
    ('/', AddProjectHandler),
    ('/delproject', DeleteProjectHandler),
    ('/new_user', RegisterUser)
], debug=True)

#@webapp_add_wsgi_middleware
#def main(app):


#if __name__ == "__main__":
#	main(app)
