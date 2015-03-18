# Created on 27-Jan-2015-Tuesday
# Wireframe created
__author__ = 'Binu Jasim (bnjasim@gmail)'
__website__ = 'www.hummuse.com'

import webapp2
import os
import jinja2
from google.appengine.ext import ndb
from google.appengine.api import users
import logging
import datetime

import utils

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
	# The parent of a Project is an Account
	projectName = ndb.StringProperty(required = True)
	projectNotes = ndb.TextProperty()
	projectCreated = ndb.DateTimeProperty(auto_now_add = True)
	projectActive = ndb.BooleanProperty(default = True)

class Entry(ndb.Model):
	# The parent of an Entry is an Account again
	date = ndb.DateProperty(required = True)	
	project = ndb.KeyProperty(Projects)
	projectName = ndb.StringProperty(required = True)
	hoursWorked = ndb.FloatProperty()
	isStarWork = ndb.BooleanProperty(default = False)
	satisfactionIndex = ndb.IntegerProperty()
	notes = ndb.TextProperty()


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

			form_warning = self.request.get('warning')
			d_message = self.request.get('dmessage')
			pName = self.request.get('pname')
			pNotes = self.request.get('pnotes')
			#logging.error(type(pname))
			p_cursor = ndb.gql("SELECT * FROM Projects WHERE ANCESTOR IS :1", user_ent_key)
			all_projects = list(p_cursor)
			active_projects = [p for p in all_projects if p.projectActive is not False]
			self.render("add_project.html", 
					     pList = active_projects, 
					     user_name = user.nickname(), 
					     logout_url = logout,
					     form_warning = form_warning,
					     delete_message = d_message,
					     pName = pName,
					     pNotes = pNotes)
	
	def post(self):
		
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
		else:
			user = users.get_current_user()
			user_ent_key = ndb.Key(Account, user.user_id())	
			pName = self.request.get('pname')
			logging.error(pName)
			pNotes = self.request.get('pnotes')
			p_cursor = ndb.gql("SELECT * FROM Projects WHERE ANCESTOR IS :1", user_ent_key)
			all_projects = list(p_cursor)
			all_projects_name = [p.projectName for p in all_projects]
			if (pName):
				if (pName not in all_projects_name):
					pro = Projects(parent = user_ent_key, 
								   projectName=pName, 
								   projectNotes=pNotes)
					pro.put()
					self.redirect('/')
				else:
					self.redirect(format('/project?warning=The Project '+str(pName)+' already exists!&pname='+str(pName)+'&pnotes='+str(pNotes)))
			else:
				self.redirect(format('/project?warning=Project Title is too short&pnotes='+str(pNotes)))


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
				message = format("Project \""+ p.projectName +"\" deleted successfully! ")
			else: message = "Couldn't delete"
			self.redirect('/project?dmessage='+message)

class MakeEntryHandler(Handler):
	
	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
		else:
			logout = users.create_logout_url('/')
			user_ent_key = ndb.Key(Account, user.user_id())	
			
			form_warning = self.request.get('form_warning')
			message = self.request.get('message')
			p_cursor = ndb.gql("SELECT * FROM Projects WHERE ANCESTOR IS :1", user_ent_key)
			all_projects = list(p_cursor)
			active_projects = [p for p in all_projects if p.projectActive is not False]

			t = datetime.date.today()
			today = (t.day, t.month, t.year)
			temp = today
			seven_prev_days = [today] #initialize
			for i in range(7):
				temp1 = utils.get_prev_date(temp)
				seven_prev_days.append(temp1)
				temp = temp1
			# format into Jan-3-2015 format	
			prev_days = ["today","yesterday"]
			for i in range(7 - 2):
				temp = seven_prev_days[2+i]
				new_date_str = utils.months[temp[1]] + " - " + str(temp[0])
				prev_days.append(new_date_str)

			self.render("make_entry.html", 
						 user_name = user.nickname(), 
					     logout_url = logout,
					     projects = active_projects,
					     form_warning = form_warning,
					     prev_days_str = prev_days,
					     special_message = message)

	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
		else:
			user = users.get_current_user()
			user_ent_key = ndb.Key(Account, user.user_id())	
			project = self.request.get('project')
			notes = self.request.get('notes')
			hours = self.request.get('hours')
			minutes = self.request.get('minutes')
			special = self.request.get('starred')
			date = self.request.get('date')
			stars =self.request.get('satisfaction')
			# Error handling of the form elements
			form_warning = ""
			project = int(project)
			p_cursor = ndb.gql("SELECT * FROM Projects WHERE ANCESTOR IS :1", user_ent_key)
			all_projects = list(p_cursor)
			all_projects_id = [p.key.id() for p in all_projects]
			active_projects_id = [p.key.id() for p in all_projects if p.projectActive is not False]
			if (project not in active_projects_id):
				self.redirect('/entry?form_warning= Invalid Project Name')
			index = all_projects_id.index(project)
			projName = all_projects[index].projectName
			stars = int(stars)
			if(stars > 5): stars = 1 


			t = datetime.date.today()
			today = (t.day, t.month, t.year)
			temp = today
			seven_prev_days = [today] #initialize
			for i in range(7):
				temp1 = utils.get_prev_date(temp)
				seven_prev_days.append(temp1)
				temp = temp1
			date_of_entry = seven_prev_days[int(date)]	# in (d,m,y) format
			ndb_date = t.replace(day = date_of_entry[0],
								 month = date_of_entry[1],
								 year = date_of_entry[2])

			hours_worked = int(hours) + int(minutes)/60.0
			if special == 'True':
				starred = True
			else: starred = False

			projectKey = ndb.Key(Account, user.user_id(), Projects, int(project))
			logging.error(projectKey)
			entry = Entry(parent = user_ent_key, 
							project=projectKey, 
							projectName = projName,
							notes=notes,
							date = ndb_date,	
							hoursWorked = hours_worked,
							isStarWork = starred,
							satisfactionIndex = stars)
			entry.put()
			self.redirect('/entry?message=Entry entered successfully')


class ListEntriesHandler(Handler):
	
	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
		else:
			fresh_user = self.request.get('fresh_user')
			message_new_user = ''
			if fresh_user == 'True':
				message_new_user = 'Thank you for Signing Up to Hummuse'

			link_addprojects = '/project'
			link_makeentry = '/entry'

			logout = users.create_logout_url('/')
			user = users.get_current_user()
			user_ent_key = ndb.Key(Account, user.user_id())

			qry = Entry.query(ancestor = user_ent_key).order(-Entry.date, Entry.project)	
			all_entries = qry.fetch()	
			self.render("entries_main_page.html",
						 user_name = user.nickname(), 
					     logout_url = logout,
					     link_addprojects = link_addprojects,
					     link_makeentry = link_makeentry,
						 entries = all_entries,
						 message = message_new_user)



class RegisterUserHandler(webapp2.RequestHandler):
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
			self.redirect('/list?fresh_user=' + str(status))			
		
		else:
			self.response.write('Access Denied')



class HomeHandler(Handler):
	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
		else:
			self.redirect('/list')


app = webapp2.WSGIApplication([
	('/', HomeHandler),
    ('/project', AddProjectHandler),
    ('/delproject', DeleteProjectHandler),
    ('/entry', MakeEntryHandler),
    ('/new_user', RegisterUserHandler),
    ('/list', ListEntriesHandler)
], debug=True)

#@webapp_add_wsgi_middleware
#def main(app):


#if __name__ == "__main__":
#	main(app)
